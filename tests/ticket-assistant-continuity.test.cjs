const assert = require("node:assert/strict");
const { test } = require("node:test");
const { analyze } = require("../projects/ticket-assistant/routing-continuity.js");
const boot = require("../projects/ticket-assistant/routing-boot.js");

function request(description, fields = {}) {
  return analyze({ subject: "Support request", description, ...fields });
}

const categories = result => result.matches.map(({ id }) => id);

test("a named device stays anchored across the next startup observation", () => {
  const result = request("I turn it on and the label reader displays its manufacturer logo. It has been there for several minutes and the home menu never loads. Across the building a VPN connection drops when another user signs in.");
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(categories(result), ["network", "hardware"]);
  assert.ok(result.matches.find(({ id }) => id === "hardware").terms.includes("label reader"));
});

test("a startup wordmark followed by normal home navigation does not add a fault", () => {
  const result = request("The inventory reader displays its wordmark when it powers on. It reaches the home menu normally. The VPN drops on another device.");
  assert.deepEqual(categories(result), ["network"]);
});

test("a new service or two devices prevent carryover from the last logo", () => {
  for (const description of [
    "The label reader shows its wordmark. The VPN drops. It has been there for ten minutes.",
    "The label reader and the printer display the logo. It has been there for ten minutes. The VPN drops."
  ]) {
    const result = request(description);
    assert.ok(!categories(result).includes("hardware"), description);
  }
});

test("a distinct observed tunnel loss stays active beside a local startup fault", () => {
  const current = request("The receipt printer powers on but remains on its company emblem. Separately my notebook loses the VPN connection whenever I work from another room.");
  assert.equal(current.status, "ambiguous");
  assert.deepEqual(categories(current), ["network", "hardware"]);
  const recovered = request("The receipt printer powers on but remains on its company emblem. Yesterday the VPN dropped. It works normally now.");
  assert.deepEqual(categories(recovered), ["hardware"]);
});

test("a dependent program message stays background when the replacement works", () => {
  const description = "The document scanner cannot go past its welcome image. The program reports it cannot detect the scanner whenever it is on that screen. I can run the application with a different scanner.";
  const result = request(description, { subject: "Scanner missing from application" });
  assert.deepEqual(categories(result), ["hardware"]);
  assert.ok(result.ignoredMatches.some(({ id }) => id === "software"));
  const independent = request(description + " The separate reports application crashes during export.");
  assert.deepEqual(categories(independent), ["hardware", "software"]);
});

test("mail symptoms dependent on VPN can be set aside while a distinct mail failure persists", () => {
  const description = "Outlook stops receiving whenever the VPN drops. I can open the same mailbox from another connection.";
  const result = request(description, { subject: "Outlook stops whenever the VPN drops" });
  assert.deepEqual(categories(result), ["network"]);
  assert.ok(result.ignoredMatches.some(({ id }) => id === "email"));
  const independent = request(description + " The separate calendar fails to send invitations on a working connection.");
  assert.deepEqual(categories(independent), ["network", "email"]);
});

test("a closed record can own its following quote without swallowing a current diagnostic", () => {
  const description = "The old ticket was resolved. Its record said “The design application closes during export.” Now Outlook says “Mailbox unavailable.”";
  const result = request(description);
  assert.deepEqual(categories(result), ["email"]);
  assert.ok(result.ignoredMatches.some(({ id }) => id === "software"));
});

test("visible desktop and conditional help do not replace observed program failure", () => {
  const fields = {
    subject: "Saving the worksheet closes it",
    description: "A help article says to test the monitor if the screen goes dark. I can still see the rest of the desktop. The spreadsheet application closes every time I save a copy.",
    error: "",
    impact: "One employee"
  };
  const result = analyze(fields);
  assert.deepEqual(categories(result), ["software"]);
  assert.deepEqual(result.reported, boot.analyze(fields).reported);
});

test("a vague recurrence after multiple historical topics remains manual", () => {
  const result = request("The earlier note described both a keyboard problem and a password problem. The requester says “It failed again” and is not sure which service was in use.");
  assert.equal(result.suggestedCategory, null);
  assert.equal(result.status, "unrecognized");
  assert.ok(result.ignoredMatches.some(({ id }) => id === "access"));
  assert.ok(result.ignoredMatches.some(({ id }) => id === "hardware"));
});
