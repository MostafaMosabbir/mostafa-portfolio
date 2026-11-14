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
  const previousRules = window.TicketTriageRefined;
  const currentRules = window.TicketTriageObserved;
  if (!evaluation || !previousRules || !currentRules) return;

  const metrics = [
    ["agreed", "Matched expected route"],
    ["extraReview", "Manual review when a category was expected"],
    ["unexpectedSuggestion", "Unexpected category suggestion"]
  ];

  function node(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }

  function describeResult(result) {
    return describeRoute({ status: result.status, category: result.suggestedCategory });
  }

  // Evaluate the same locked ticket and technician expectation against all
  // versions. The queue loads the identical case when someone selects Try ticket.
  function renderComparison(set, tickets) {
    const section = container.querySelector(`[data-assistant-comparison="${set}"]`);
    const baseline = evaluation.evaluateChallenge(triage.analyze, tickets);
    const before = evaluation.evaluateChallenge(previousRules.analyze, tickets);
    const after = evaluation.evaluateChallenge(currentRules.analyze, tickets);
    section.querySelector("[data-assistant-comparison-summary]").textContent =
      `The previous rules matched ${before.agreed} of ${before.total} expected routes. The current rules matched ${after.agreed} of ${after.total}.`;
    const counts = section.querySelector("[data-assistant-comparison-counts]");
    for (const [key, label] of metrics) {
      const row = document.createElement("tr");
      const heading = node("th", label);
      heading.scope = "row";
      row.append(heading, node("td", baseline[key]), node("td", before[key]), node("td", after[key]));
      counts.append(row);
    }
    const list = section.querySelector("[data-assistant-comparison-outcomes]");
    for (const [index, original] of baseline.rows.entries()) {
      const { id, title, expected, actual, rationale } = original;
      const previous = before.rows[index];
      const updated = after.rows[index];
      const item = document.createElement("li");
      item.dataset.assistantOutcome = updated.outcome;
      const content = document.createElement("div");
      content.append(
        node("strong", title),
        node("p", `Expected ${describeRoute(expected)}. Original ${describeResult(actual)}. Before ${describeResult(previous.actual)}. After ${describeResult(updated.actual)}.`),
        node("p", rationale)
      );
      if (updated.outcome !== "agreed") content.append(node("p", "Still misses the expected route."));
      const open = node("button", "Try ticket");
      open.type = "button";
      open.setAttribute("aria-label", `Try ticket, ${title}`);
      open.addEventListener("click", () => {
        document.getElementById("tab-overview").click();
        document.getElementById("ticket-assistant-demo").dispatchEvent(
          new CustomEvent("ticket-assistant:open-case", { detail: id })
        );
      });
      item.append(content, open);
      list.append(item);
    }
    section.hidden = false;
  }

  renderComparison("challenge", evaluation.cases);
  const fresh = window.TicketTriageFreshCases;
  if (fresh?.length) renderComparison("fresh", fresh);
  const validation = window.TicketTriageValidationCases;
  if (validation?.length) renderComparison("validation", validation);
  const transfer = window.TicketTriageTransferCases;
  if (transfer?.length) renderComparison("transfer", transfer);
  container.querySelector("[data-assistant-comparison-loading]").hidden = true;
})();
