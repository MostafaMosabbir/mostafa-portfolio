(() => {
  "use strict";

  const container = document.getElementById("ticket-assistant-findings");
  const triage = window.TicketTriage;
  if (!container || !triage) return;

  const { total, passed, matched, manual, rows } = triage.evaluateSamples();
  const categoryLabels = new Map(triage.categories.map(({ id, label }) => [id, label]));
  const routeLabels = { ambiguous: "Multiple categories", unrecognized: "No supported category" };

  function describeRoute({ status, category }) {
    return categoryLabels.get(category) || routeLabels[status] || "Needs manual review";
  }

  for (const [metric, value] of Object.entries({ matched, manual, passed })) {
    container.querySelector(`[data-assistant-metric="${metric}"]`).textContent = value;
  }
  const outcomes = container.querySelector("[data-assistant-outcomes]");
  for (const row of rows) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    const outcome = document.createElement("span");
    name.textContent = row.title;
    outcome.textContent = row.passed ?
      `${describeRoute(row.actual)} · Expected outcome` :
      `Expected ${describeRoute(row.expected)}. Got ${describeRoute(row.actual)}.`;
    item.append(name, outcome);
    outcomes.append(item);
  }
  container.querySelector("[data-assistant-evaluation]").textContent = passed === total ?
    `All ${total} fictional tickets followed the expected route. The sample includes clear requests, requests that match two rules, and requests with too little detail.` :
    `${passed} of ${total} fictional tickets followed the expected route. The breakdown below shows the differences.`;
  container.querySelector("[data-assistant-results]").hidden = false;

  const evaluation = window.TicketTriageEvaluation;
  if (!evaluation) return;

  const challenge = evaluation.evaluateChallenge(triage.analyze);
  const labels = {
    agreed: "Agrees with expected route",
    extraReview: "Sent to manual review",
    unexpectedSuggestion: "Suggestion misses expected route"
  };
  for (const metric of Object.keys(labels)) {
    container.querySelector(`[data-assistant-challenge-metric="${metric}"]`).textContent = challenge[metric];
  }
  container.querySelector("[data-assistant-challenge-summary]").textContent =
    `The existing rules agreed with the expected route on ${challenge.agreed} of ${challenge.total} new fictional tickets. The expected routes were set before running the rules.`;

  // Show actual results alongside the reviewer's reasoning, using the same
  // ticket data that the Workbench opens when the visitor selects Try ticket.
  const challengeOutcomes = container.querySelector("[data-assistant-challenge-outcomes]");
  for (const { id, title, expected, actual, outcome, rationale } of challenge.rows) {
    const item = document.createElement("li");
    item.dataset.assistantOutcome = outcome;
    const content = document.createElement("div");
    const heading = document.createElement("strong");
    const comparison = document.createElement("p");
    const reason = document.createElement("p");
    const open = document.createElement("button");
    heading.textContent = title;
    const expectedRoute = describeRoute(expected);
    const actualRoute = describeRoute({ status: actual.status, category: actual.suggestedCategory });
    comparison.textContent = `${labels[outcome]}. Expected ${expectedRoute}. Rules returned ${actualRoute}.`;
    reason.textContent = rationale;
    open.type = "button";
    open.textContent = "Try ticket";
    open.setAttribute("aria-label", `Try ticket, ${title}`);
    open.addEventListener("click", () => {
      document.getElementById("tab-overview").click();
      document.getElementById("ticket-assistant-demo").dispatchEvent(
        new CustomEvent("ticket-assistant:open-case", { detail: id })
      );
    });
    content.append(heading, comparison, reason);
    item.append(content, open);
    challengeOutcomes.append(item);
  }
  container.querySelector("[data-assistant-challenge-results]").hidden = false;
})();
