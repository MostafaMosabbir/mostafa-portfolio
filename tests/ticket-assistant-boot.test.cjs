const assert = require("node:assert/strict");
const { test } = require("node:test");
const { analyze } = require("../projects/ticket-assistant/routing-boot.js");
const previous = require("../projects/ticket-assistant/routing-evidence.js");

function ticket(description, fields = {}) {
  return analyze({ subject: "Support request", description, ...fields });
}

test("startup progress evidence identifies two independent active issues", () => {
  for (const description of [
    "The label reader remains at the manufacturer’s logo and never loads its menu. Separately, the VPN disconnects on both laptops.",
    "The handheld terminal stops before the home view. The VPN drops on another desk.",
    "The kiosk never makes it beyond the brand name. The VPN drops on a different computer.",
    "The label reader freezes at the main menu after power on. The VPN also disconnects remotely."
  ]) {
    const result = ticket(description);
    assert.equal(result.status, "ambiguous", description);
    assert.equal(result.suggestedCategory, null, description);
    assert.deepEqual(result.matches.map(({ id }) => id), ["network", "hardware"], description);
  }
});

test("healthy physical readers and software scanners do not add hardware evidence", () => {
  for (const description of [
    "The badge reader never got stuck and now reaches its home screen. The VPN fails separately.",
    "The vulnerability scanner cannot load its main menu. The VPN fails separately."
  ]) {
    assert.equal(ticket(description).matches.some(({ id }) => id === "hardware"), false, description);
  }
});

test("a closed quote does not consume a current sentence or a contrast in the same sentence", () => {
  const wording = [
    "We closed our support ticket this morning. The previous entry said “Account is locked.” The Ethernet link stays down at the counter.",
    "We closed the earlier account ticket yesterday, but the VPN still drops after ten minutes.",
    "The resolved account case said “Your account is locked,” but two counters now show no wired connection."
  ];
  for (const description of wording) {
    const result = ticket(description);
    assert.equal(result.suggestedCategory, "network", description);
  }
  assert.ok(ticket(wording[0]).ignoredMatches.some(({ id }) => id === "access"));
  assert.ok(ticket(wording[2]).ignoredMatches.some(({ id }) => id === "access"));
});

test("a current quoted error remains available after old work is closed", () => {
  const result = ticket("We closed the printer incident yesterday. The old note said “Printer unavailable.” Right now the staff hub shows “Your account is locked.”");
  assert.equal(result.suggestedCategory, "access");
});

test("a ticket that was not closed still reports an active fault", () => {
  const result = ticket("We never closed the printer incident. The latest error reads “The printer has no power.” The VPN drops on a different computer.");
  assert.equal(result.status, "ambiguous");
});

test("display advice is background but an actual display fault remains separate from an application exit", () => {
  const appFault = "The application quits each time I export a spreadsheet.";
  const advice = ticket("Our support page tells me to check the monitor. The screen stays clear. " + appFault);
  assert.equal(advice.suggestedCategory, "software");
  assert.ok(advice.ignoredMatches.some(({ id }) => id === "hardware"));
  const observed = ticket("My external monitor goes dark even at startup. " + appFault);
  assert.equal(observed.status, "ambiguous");
  assert.deepEqual(observed.matches.map(({ id }) => id), ["hardware", "software"]);
});

test("replacement context does not hide a symptom observed on the new device", () => {
  const healthy = ticket("The old display was replaced and the new one works normally. Outlook cannot open the shared mailbox.");
  assert.equal(healthy.suggestedCategory, "email");
  const faulty = ticket("The faulty monitor was swapped out, but the new monitor flickers during the built in test. Outlook cannot open the shared mailbox.");
  assert.equal(faulty.status, "ambiguous");
});

test("an unnamed recurrence in a note naming two problems is left for review", () => {
  const withScope = {
    description: "An earlier note described a failing installer and a printer that hung. It stopped again. I cannot tell which one I ran.",
    subject: "Follow up",
    scope: "One staff member"
  };
  const result = analyze(withScope);
  assert.equal(result.suggestedCategory, null);
  assert.deepEqual(result.ignoredMatches.map(({ id }) => id), ["hardware", "software"]);
  assert.deepEqual(result.reported, previous.analyze(withScope).reported);
});
