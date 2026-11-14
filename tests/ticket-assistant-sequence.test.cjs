const assert = require("node:assert/strict");
const { test } = require("node:test");
const { analyze } = require("../projects/ticket-assistant/routing-sequence.js");
const prior = require("../projects/ticket-assistant/routing-continuity.js");

function ticket(description, fields = {}) {
  return analyze({ subject: "Support request", description, ...fields });
}

const routes = result => result.matches.map(({ id }) => id);

test("a single startup device stays active when its menu and logo observations arrive in either order", () => {
  for (const description of [
    "I switched on the handheld barcode reader. The home menu never loads. The screen keeps showing the company emblem. Separately, the VPN drops for the staff upstairs.",
    "I switched on the handheld barcode reader. The screen keeps showing the company emblem. The home menu never loads. Separately, the VPN drops for the staff upstairs.",
    "The receipt printer powers on. The menu never appears. The display still shows the maker logo. Staff on another floor get kicked out of the VPN."
  ]) {
    const result = ticket(description);
    assert.equal(result.status, "ambiguous");
    assert.deepEqual(routes(result), ["network", "hardware"]);
    assert.ok(result.matches[1].terms.some(term => /reader|printer/.test(term)));
  }
});

test("a different topic or two possible devices breaks startup carryover", () => {
  for (const description of [
    "I switched on the handheld barcode reader. The VPN drops for staff elsewhere. The display still shows a company emblem.",
    "I switched on the handheld barcode reader and the receipt printer. The menu never appears. The display keeps showing the maker logo. Our VPN drops."
  ]) {
    assert.ok(!routes(ticket(description)).includes("hardware"), description);
  }
});

test("a normal startup picture does not become a device fault without stalled progress", () => {
  const result = ticket("I switched on the card reader. The display shows its logo. The home menu opens normally. Another person reports that the VPN drops.");
  assert.deepEqual(routes(result), ["network"]);
});

test("startup evidence wins over a dependent missing device message, but not an independent application fault", () => {
  const description = "The card reader status light blinks at startup and never changes. The device never shows its ready indicator. Our app reports No reader detected whenever this happens. The app detects a replacement reader.";
  const result = ticket(description, { subject: "App cannot see the reader" });
  assert.deepEqual(routes(result), ["hardware"]);
  assert.ok(result.ignoredMatches.some(({ id }) => id === "software"));
  const separate = ticket(description + " Our document application separately freezes when I export a report.");
  assert.deepEqual(routes(separate), ["hardware", "software"]);
});

test("a blank local camera preview stays active alongside a separate portal error", () => {
  const result = ticket("The webcam preview is black when I use the local video test. On a different computer the portal displays “Verification request rejected.”");
  assert.deepEqual(routes(result), ["access", "hardware"]);
});

test("a working monitor and alternate test display do not compete with an observed application failure", () => {
  const result = ticket("The monitor keeps showing the desktop. The video application hangs whenever I scrub the timeline. It hangs on the laptop screen as well.");
  assert.deepEqual(routes(result), ["software"]);
  assert.ok(result.ignoredMatches.some(({ id }) => id === "hardware"));
});

test("historical equipment replacement and closed quotes do not mask present evidence", () => {
  const email = ticket("We replaced the faulty desktop and closed that request. Today Outlook says the mailbox is unavailable.");
  assert.deepEqual(routes(email), ["email"]);
  const software = ticket("The old mailbox incident is closed. Its note said “Outlook cannot send.” The editor vanishes each time I paste a table.");
  assert.deepEqual(routes(software), ["software"]);
  assert.ok(software.ignoredMatches.some(({ id }) => id === "email"));
});

test("an uncertain recurrence from a historical note does not choose between devices", () => {
  const result = ticket("An earlier note mentioned a badge reader and a label printer. Someone reported it quit again. I am not sure which device they tested.");
  assert.equal(result.suggestedCategory, null);
  assert.equal(result.status, "unrecognized");
  assert.ok(result.ignoredMatches.some(({ id, terms }) => id === "hardware" && terms.includes("badge reader")));
});

test("reported facts are still supplied by the same intake validation", () => {
  const fields = {
    subject: "A scanner and a portal",
    description: "I powered on a receipt printer. It stays there with its opening picture.",
    error: "Access blocked because this user account is disabled.",
    scope: "One person"
  };
  assert.deepEqual(analyze(fields).reported, prior.analyze(fields).reported);
  assert.throws(() => analyze({ subject: "", description: "" }));
});
