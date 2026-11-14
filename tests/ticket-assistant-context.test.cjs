const assert = require("node:assert/strict");
const { test } = require("node:test");
const baseline = require("../projects/ticket-assistant/triage.js");
const { analyze } = require("../projects/ticket-assistant/routing-context.js");

test("fixed equipment in a separate clause does not drive an account request", () => {
  const result = analyze({
    subject: "Training portal keeps rejecting the code",
    description: "The printer setup is finished, but I still cannot get into the training portal. It says my six digit code expired each time."
  });

  assert.equal(result.suggestedCategory, "access");
  assert.deepEqual(result.matches.map(({ id }) => id), ["access"]);
  assert.deepEqual(result.ignoredMatches.map(({ id, terms }) => [id, terms]), [["hardware", ["printer"]]]);
});

test("a service that works normally is background to a different failure", () => {
  const result = analyze({ subject: "Connection drops", description: "Email works normally and the VPN disconnects." });

  assert.equal(result.suggestedCategory, "network");
  assert.deepEqual(result.ignoredMatches.map(({ id }) => id), ["email"]);
});

test("the same category can have both working and failing devices", () => {
  const result = analyze({
    subject: "Problems after lunch",
    description: "The keyboard was fixed yesterday. The printer still stalls. The VPN disconnects."
  });

  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.matches.map(({ id }) => id), ["network", "hardware"]);
  assert.deepEqual(result.ignoredMatches[0].terms, ["keyboard"]);
  assert.deepEqual(result.matches.find(({ id }) => id === "hardware").terms, ["printer"]);
});

test("a negated or temporary fix is not treated as resolved", () => {
  for (const description of [
    "The printer was not fixed. The VPN disconnects.",
    "The printer works only briefly. The VPN disconnects.",
    "The printer works until the queue fills. The VPN disconnects."
  ]) {
    const result = analyze({ subject: "Two issues", description });
    assert.equal(result.status, "ambiguous", description);
    assert.deepEqual(result.matches.map(({ id }) => id), ["network", "hardware"], description);
  }
});

test("an explicit recovery in the request can override an outdated subject", () => {
  const result = analyze({
    subject: "VPN disconnects",
    description: "The VPN is fixed. The printer no longer prints."
  });

  assert.equal(result.suggestedCategory, "hardware");
  assert.deepEqual(result.ignoredMatches.map(({ id }) => id), ["network"]);
});

test("an explicit error can route a vague request while preserving reported facts", () => {
  const fields = {
    subject: "Cannot get to my work",
    description: "Every attempt stops at the same screen.",
    error: "Account locked after authentication attempts.",
    onset: "This morning"
  };
  const result = analyze(fields);

  assert.equal(result.suggestedCategory, "access");
  assert.deepEqual(result.reported, baseline.analyze(fields).reported);
  const draft = baseline.draftReply(result);
  assert.doesNotMatch(draft, /When did this first occur|What exact error appears/);
  assert.match(draft, /Which application is affected/);
});

test("device context alone cannot route a permissions problem to hardware", () => {
  const result = analyze({
    subject: "Unable to open finance folder",
    description: "I use a laptop. The shared folder says Access denied. My colleagues can open it."
  });

  assert.equal(result.suggestedCategory, null);
  assert.deepEqual(result.ignoredMatches[0].terms, ["laptop"]);
});

test("rules do not infer a cause when two supported symptoms remain active", () => {
  const result = analyze({
    subject: "Outlook stops syncing when the VPN drops",
    description: "My Outlook inbox stops updating whenever the VPN disconnects."
  });

  assert.equal(result.suggestedCategory, null);
  assert.deepEqual(result.matches.map(({ id }) => id), ["network", "email"]);
  assert.deepEqual(result.ignoredMatches, []);
});
