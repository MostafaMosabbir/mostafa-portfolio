const assert = require("node:assert/strict");
const { test } = require("node:test");
const { analyze } = require("../projects/ticket-assistant/routing-substitution.js");
const prior = require("../projects/ticket-assistant/routing-sequence.js");

function ticket(description, fields = {}) {
  return analyze({ subject: "Support request", description, ...fields });
}

const routes = result => result.matches.map(({ id }) => id);

test("the local startup failure and confirmed replacement identify hardware in either order", () => {
  const local = "The card reader does not show its ready light during startup, even with the computer off.";
  const observed = "Our receiving app reports No reader detected for this device, but immediately recognizes the replacement reader.";
  for (const description of [`${local} ${observed}`, `${observed} ${local}`]) {
    const result = ticket(description, { subject: "App cannot find this reader" });
    assert.deepEqual(routes(result), ["hardware"]);
    assert.ok(result.ignoredMatches.some(({ id, terms }) => id === "software" && terms.includes("app")));
  }
});

test("confirmed replacement does not clear an independently observed app crash", () => {
  const result = ticket("The label scanner never reaches the ready symbol during startup. Our shipping application says No scanner detected but recognizes the spare scanner. Our reporting application crashes while exporting a spreadsheet without any equipment attached.");
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(routes(result), ["hardware", "software"]);
});

test("a hypothetical or failed replacement does not reclassify its application message as background", () => {
  const startup = "The document scanner cannot display its ready screen during startup.";
  for (const comparison of [
    "Our shipping application says No scanner detected. It might detect the spare scanner when we receive it.",
    "Our shipping application says No scanner detected. It cannot detect the spare scanner either."
  ]) {
    const result = ticket(`${startup} ${comparison}`, { subject: "Software problem" });
    assert.ok(!result.ignoredMatches.some(({ id, terms }) => id === "software" && terms.includes("application")));
  }
});

test("replacement alone does not turn a software scanner into defective hardware", () => {
  const result = ticket("The vulnerability scanner never reaches its ready screen during startup. The application finds a replacement device.");
  assert.ok(!routes(result).includes("hardware"));
});

test("dated closure and a successful printer test stay separate from current application failure in either order", () => {
  const history = "Thursday’s closed printer incident recorded “Paper jam.” The printer produces a clean test page now.";
  const app = "The scheduling application crashes whenever I export a report, even on another computer that has no printer.";
  for (const description of [`${history} ${app}`, `${app} ${history}`]) {
    const result = ticket(description);
    assert.deepEqual(routes(result), ["software"]);
    assert.ok(result.ignoredMatches.some(({ id }) => id === "hardware"));
  }
});

test("a current printer jam and independent application fault remain distinct", () => {
  const result = ticket("On Thursday the open printer ticket reported “Paper jam.” The paper still jams during the printer's own test. The application separately crashes during export on a computer without a printer.");
  assert.deepEqual(routes(result), ["hardware", "software"]);
});

test("an explicit rejected verification diagnostic and expired approval identify account access", () => {
  const fields = {
    subject: "Cannot finish",
    description: "My colleague completes the same workflow on this workstation.",
    error: "Authentication was rejected because the approval request expired.",
    scope: "One person"
  };
  const result = analyze(fields);
  assert.deepEqual(routes(result), ["access"]);
  assert.deepEqual(result.reported, prior.analyze(fields).reported);
});

test("an unassigned recurrence cannot turn a dated note into a current service failure", () => {
  const result = ticket("Tuesday’s note described a label printer and the calendar. Someone says it stopped, but they did not record which thing they were using.");
  assert.equal(result.suggestedCategory, null);
  assert.equal(result.status, "unrecognized");
  assert.ok(result.ignoredMatches.some(({ id }) => id === "email"));
});
