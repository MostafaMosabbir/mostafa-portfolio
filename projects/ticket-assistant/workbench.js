(() => {
  "use strict";

  const root = document.getElementById("ticket-assistant-demo");
  const engine = window.TicketTriage;
  if (!root || !engine) return;

  const find = name => root.querySelector(`[data-assistant-${name}]`);
  const workspace = find("workspace");
  const queue = find("queue");
  const queuePicker = find("queue-picker");
  const queueSet = find("queue-set");
  const challengePicker = find("challenge-picker");
  const challengeTicket = find("challenge-ticket");
  const subject = root.querySelector("#ticket-assistant-subject");
  const description = find("description");
  const suggestion = find("suggestion");
  const reasons = find("reasons");
  const reported = find("reported");
  const questions = find("questions");
  const noFacts = find("no-facts");
  const noQuestions = find("no-questions");
  const intake = find("intake");
  const analyzeButton = find("analyze");
  const intakeError = find("error");
  const category = root.querySelector("#ticket-assistant-categories");
  const reply = root.querySelector("#ticket-assistant-reply");
  const reconcile = find("reconcile");
  const keep = find("keep");
  const generate = find("generate");
  const review = find("review");
  const status = find("status");
  const fieldNames = ["subject", "description", "scope", "onset", "error", "workaround"];
  const categoryLabels = new Map(engine.categories.map(({ id, label }) => [id, label]));
  const ticketStates = new Map();
  const queueButtons = new Map();
  const challengeCases = window.TicketTriageEvaluation?.cases ?? [];
  const hasChallengeQueue = Boolean(queueSet && challengePicker && challengeTicket && challengeCases.length);
  if (queuePicker) queuePicker.hidden = !hasChallengeQueue;
  const selectedTickets = new Map([["demo", engine.samples[0].id]]);
  if (hasChallengeQueue) selectedTickets.set("challenge", challengeCases[0].id);
  let active;

  for (const { id, label } of engine.categories) {
    category.add(new Option(label, id));
  }

  function createState(sample) {
    const fields = Object.fromEntries(fieldNames.map(name => [name, sample.fields[name] ?? ""]));
    const result = engine.analyze(fields);
    const draft = engine.draftReply(result);
    return {
      fields,
      pending: { ...fields },
      result,
      category: result.suggestedCategory ?? "",
      draft,
      generatedDraft: draft,
      revision: 0,
      draftRevision: 0,
      reviewed: false
    };
  }

  function element(tag, value) {
    const node = document.createElement(tag);
    node.textContent = value;
    return node;
  }

  function renderQuestions() {
    const items = engine.questionsFor(active.result, active.category);
    questions.replaceChildren(...items.map(item => element("li", item.text)));
    noQuestions.hidden = items.length > 0;
  }

  function hasPendingChanges() {
    return fieldNames.some(name => active.pending[name] !== active.fields[name]);
  }

  // A draft belongs to a specific revision of both intake and category.
  // Making another edit revokes approval, but preserves the reply itself.
  function blocker() {
    if (hasPendingChanges()) return "Analyze the revised request before reviewing the reply.";
    return engine.reviewBlocker(active.draft, active.draftRevision, active.revision, active.category);
  }

  function updateReview() {
    const pending = hasPendingChanges();
    const block = blocker();
    const stale = active.revision !== active.draftRevision;
    analyzeButton.disabled = !pending;
    reconcile.hidden = pending || !stale || !active.draft.trim();
    keep.disabled = !active.category;
    generate.disabled = pending;
    review.disabled = Boolean(block) || active.reviewed;
    status.textContent = active.reviewed ? "Reviewed in this session. No reply was sent." :
      block || "Waiting for reviewer.";
  }

  function renderRequest() {
    subject.textContent = active.fields.subject;
    description.textContent = active.fields.description;
    const { suggestedCategory, matches, reported: facts } = active.result;
    suggestion.textContent = categoryLabels.get(suggestedCategory) ?? "Manual review needed";
    const explanations = matches.map(match => {
      const terms = match.terms.map(term => `“${term}”`).join(", ");
      return `${match.label} matched ${terms}.`;
    });
    if (!explanations.length) explanations.push("No category matched the request.");
    reasons.replaceChildren(...explanations.map(reason => element("li", reason)));
    reported.replaceChildren(...facts.map(({ label, value }) => {
      const fact = document.createElement("div");
      fact.append(element("dt", label + " "), element("dd", value));
      return fact;
    }));
    noFacts.hidden = facts.length > 0;
    renderQuestions();
  }

  function selectSample(set, id) {
    selectedTickets.set(set, id);
    active = ticketStates.get(id);
    for (const [key, button] of queueButtons) button.setAttribute("aria-pressed", String(key === id));
    if (set === "challenge") challengeTicket.value = id;
    for (const name of fieldNames) intake.elements.namedItem(name).value = active.pending[name];
    intakeError.textContent = "";
    category.value = active.category;
    reply.value = active.draft;
    renderRequest();
    updateReview();
  }

  // The queue switch changes which picker is shown. Edited requests, replies,
  // and review state belong to their ticket and stay in memory.
  function showQueue(set, id = selectedTickets.get(set)) {
    if (!id) return;
    const showingChallenge = set === "challenge";
    queue.hidden = showingChallenge;
    if (hasChallengeQueue) {
      queueSet.value = set;
      challengePicker.hidden = !showingChallenge;
    }
    selectSample(set, id);
  }

  engine.samples.forEach((sample, index) => {
    ticketStates.set(sample.id, createState(sample));
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.assistantTicket = sample.id;
    button.append(element("small", `Demo ${String(index + 1).padStart(2, "0")}`), element("span", sample.title));
    button.addEventListener("click", () => selectSample("demo", sample.id));
    queueButtons.set(sample.id, button);
    queue.append(button);
  });

  if (hasChallengeQueue) {
    for (const sample of challengeCases) {
      ticketStates.set(sample.id, createState(sample));
      challengeTicket.add(new Option(sample.title, sample.id));
    }
    queueSet.addEventListener("change", () => showQueue(queueSet.value));
    challengeTicket.addEventListener("change", () => selectSample("challenge", challengeTicket.value));
    root.addEventListener("ticket-assistant:open-case", event => {
      if (!challengeCases.some(sample => sample.id === event.detail)) return;
      showQueue("challenge", event.detail);
      challengeTicket.focus();
    });
  } else if (queueSet) {
    queueSet.hidden = true;
    for (const label of queueSet.labels) label.hidden = true;
  }

  intake.addEventListener("input", event => {
    const { name, value } = event.target;
    active.pending[name] = value;
    active.reviewed = false;
    intakeError.textContent = "";
    updateReview();
  });

  intake.addEventListener("submit", event => {
    event.preventDefault();
    if (!hasPendingChanges()) return;
    let result;
    try {
      result = engine.analyze(active.pending);
    } catch (error) {
      intakeError.textContent = error.message;
      return;
    }
    // When request wording changes, the new suggestion replaces the old route.
    // Corrections to the structured facts keep the reviewer's chosen category.
    if (active.fields.subject !== active.pending.subject || active.fields.description !== active.pending.description) {
      active.category = result.suggestedCategory ?? "";
      category.value = active.category;
    }
    active.fields = { ...active.pending };
    active.result = result;
    active.revision += 1;
    active.reviewed = false;
    intakeError.textContent = "";
    renderRequest();
    updateReview();
  });

  category.addEventListener("change", () => {
    active.category = category.value;
    active.revision += 1;
    active.reviewed = false;
    renderQuestions();
    updateReview();
  });

  reply.addEventListener("input", () => {
    active.draft = reply.value;
    active.reviewed = false;
    updateReview();
  });

  generate.addEventListener("click", () => {
    if (hasPendingChanges()) return;
    const nextDraft = engine.draftReply(active.result, active.category);
    const hasManualChanges = active.draft.trim() && active.draft !== active.generatedDraft;
    if (hasManualChanges && active.draft !== nextDraft && !window.confirm("Replace your edited reply with a fresh draft?")) return;
    active.draft = nextDraft;
    active.generatedDraft = nextDraft;
    active.draftRevision = active.revision;
    active.reviewed = false;
    reply.value = active.draft;
    updateReview();
  });

  keep.addEventListener("click", () => {
    if (keep.disabled || reconcile.hidden) return;
    active.draftRevision = active.revision;
    updateReview();
    reply.focus();
  });

  review.addEventListener("click", () => {
    if (blocker()) return;
    active.reviewed = true;
    updateReview();
  });

  showQueue("demo");
  find("loading").hidden = true;
  workspace.hidden = false;
})();
