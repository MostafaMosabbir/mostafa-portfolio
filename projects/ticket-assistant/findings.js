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
})();
