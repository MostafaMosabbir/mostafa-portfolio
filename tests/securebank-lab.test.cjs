const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../scripts/securebank-lab.js"), "utf8");
const routes = [
  { key: "guestWeb", from: "guest", to: "dmz", verdict: "allow", detail: /Guest HTTP/ },
  { key: "guestStaff", from: "guest", to: "staff", verdict: "block", detail: /Guest traffic rule/ },
  { key: "dmzStaff", from: "dmz", to: "staff", verdict: "block", detail: /DMZ-initiated ping/ },
  { key: "adminSsh", from: "admin", to: "router", verdict: "allow", detail: /Admin workstation/ },
  { key: "staffSsh", from: "staff", to: "router", verdict: "block", detail: /management access rule/ }
];

function setup() {
  const buttons = routes.map(({ key }) => ({
    dataset: { path: key },
    setAttribute(name, value) { this[name] = value; },
    addEventListener(name, callback) { this[name] = callback; }
  }));
  const devices = ["router", "staff", "guest", "dmz", "admin"].map(node => ({
    dataset: { node },
    branch: node === "router" ? null : { dataset: {} },
    closest(selector) {
      assert.equal(selector, "li");
      return this.branch;
    }
  }));
  const network = { dataset: {} };
  const verdict = {};
  const detail = {};
  const lab = {
    hidden: true,
    querySelector: selector => ({
      "[data-network]": network, "[data-verdict-label]": verdict, "[data-route-detail]": detail
    }[selector]),
    querySelectorAll: selector => ({ "[data-path]": buttons, "[data-node]": devices }[selector])
  };
  vm.runInNewContext(source, {
    document: { getElementById: id => id === "securebank-lab" ? lab : null }
  });
  return { lab, buttons, devices, network, verdict, detail };
}

test("SecureBank opens on Guest HTTP and previews the policy for all five paths", () => {
  const scene = setup();
  assert.equal(scene.lab.hidden, false);
  assert.equal(scene.buttons[0]["aria-pressed"], "true");
  assert.equal(scene.verdict.textContent, "Expected allow");

  routes.forEach((route, index) => {
    scene.buttons[index].click();
    assert.equal(scene.network.dataset.verdict, route.verdict, route.key);
    assert.equal(scene.verdict.textContent, `Expected ${route.verdict}`, route.key);
    assert.match(scene.detail.textContent, route.detail, route.key);
    assert.deepEqual(
      scene.buttons.filter(button => button["aria-pressed"] === "true").map(button => button.dataset.path),
      [route.key]
    );

    const expected = {
      [route.from]: "source",
      [route.to]: route.verdict === "allow" ? "arrival" : "blocked"
    };
    scene.devices.forEach(device => {
      const state = expected[device.dataset.node] ?? "";
      assert.equal(device.dataset.state, state);
      if (device.branch) assert.equal(device.branch.dataset.state, state);
    });
  });
});

test("SecureBank Findings separate the expected policy from pending observations", () => {
  const homepage = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const table = homepage.match(/<table\b[^>]*\bclass="[^"]*\bsb-checks\b[^"]*"[^>]*>([\s\S]*?)<\/table>/)?.[1];
  assert.ok(table, "The Findings table is present");
  const findings = Array.from(table.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g))
    .filter(([, attributes]) => attributes.includes("data-check="))
    .map(([, attributes, markup]) => {
      const cells = Array.from(markup.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g), ([, content]) =>
        content.replace(/<[^>]+>/g, "").trim()
      );
      return {
        key: attributes.match(/\bdata-check="([^"]+)"/)?.[1],
        verdict: attributes.match(/\bdata-verdict="([^"]+)"/)?.[1],
        expected: cells.at(-2)?.toLowerCase(),
        observed: cells.at(-1)
      };
    });
  assert.deepEqual(findings, routes.map(({ key, verdict }) => ({
    key, verdict, expected: verdict, observed: "Pending"
  })));
});

test("SecureBank What Changed compares two versions and leaves all evidence pending", () => {
  const homepage = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const start = homepage.indexOf('id="securebank-what-changed"');
  const end = homepage.indexOf('<details class="technical-details">', start);
  assert.ok(start >= 0 && end > start, "The What Changed comparison is present in the featured project");
  const comparison = homepage.slice(start, end);
  assert.match(comparison, /id="wc-v1-title">Original branch lab</);
  assert.match(comparison, /id="wc-v2-title">Branch and HQ</);

  const versions = Array.from(
    comparison.matchAll(/class="wc-status"[^>]*>\s*Observed ·\s*<strong>([^<]+)<\/strong>/gi),
    ([, status]) => status.trim().toLowerCase()
  );
  assert.deepEqual(versions, ["pending", "pending"]);

  const evidence = Array.from(
    comparison.matchAll(/class="wc-slot"[^>]*>\s*<strong>([^<]+)<\/strong>\s*<p>Expected ([^·]+)· Observed ([^<]+)<\/p>/gi),
    ([, name, expected, observed]) => [name.trim(), expected.trim(), observed.trim().toLowerCase()]
  );
  assert.deepEqual(evidence, [
    ["Teller → HQ app", "allow", "pending"],
    ["Staff → HQ app", "block at R2", "pending"],
    ["Guest → Outside test site", "allow", "pending"],
    ["Guest → HQ app", "block at R1", "pending"],
    ["Admin → R1 SSH", "allow", "pending"],
    ["Staff → R1 SSH", "block", "pending"]
  ]);
});
