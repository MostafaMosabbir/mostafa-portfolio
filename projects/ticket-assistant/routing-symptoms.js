(function (root) {
  "use strict";

  const node = typeof module !== "undefined" && module.exports;
  const baseline = node ? require("./triage.js") : root.TicketTriage;
  const prior = node ? require("./routing-independent.js") : root.TicketTriageIndependent;
  if (!baseline || !prior) return;

  const categories = baseline.categories.filter(({ id }) => id !== "other");
  const closedSource = /\b(?:closed|resolved|completed|fixed)\s+(?:(?:support|service)\s+)?(?:ticket|incident|case|report|note|record|request)\s+(?:(?:from|on|dated)\s+[^.!?;“”"\n]{1,50}?\s+)?(?:says?|said|read|reported|showed|contained|recorded|logged)\s*:?\s*[“"]([^”"\n]+)[”"]/gi;
  const guidance = /^(?:(?:the|a|our)\s+)?(?:support\s+|troubleshooting\s+)?(?:instructions|guide|runbook|help article|manual|checklist)\s+(?:says?|said|suggests?|suggested|advises?|advised|recommends?|recommended)\s+(?:(?:to|that)\s+)?[“"]?(?:test(?:ing)?|check(?:ing)?|restart(?:ing)?|reset(?:ting)?|verify|verifying|if|when)\b/i;
  const observationStart = /,?\s+and\s+(?=(?:i|we)\s+(?:saw|heard|confirmed|observed|tested|checked|tried|found|noticed)\b)/i;
  const conditional = /\b(?:if|whether|may|might|supposedly|should)\b/i;
  const recovering = /\b(?:no longer|not stuck|never got stuck|repaired and working|now works|working normally)\b/i;

  const scanner = /\bscanner\b/gi;
  const unpoweredDevice = /\b(?:no power|(?:will not|won['’]t) (?:start|power on))\b/i;
  const scanMechanism = /\b(?:stuck|hangs?|freez\w*|frozen)\b[^.!?;]{0,40}\b(?:logo|startup|boot screen|initializ\w*|warmup)|\b(?:jams?|jammed)\b|\bcarriage\b[^.!?;]{0,35}\b(?:stalls?|stops?|sticks?)\b/i;
  const nonPhysicalScanner = /\b(?:vulnerability|virus|malware|security|software|network|port) scanner\b/i;
  const audioInput = /\b(?:microphone|headset|headphones)\b/gi;
  const audioInputFailure = /\b(?:stopp?ed|stops?) (?:picking up|recording|capturing) (?:any |the )?(?:sound|audio|speech)\b/i;
  const camera = /\b(?:usb camera|webcam|camera)\b/gi;
  const earlierRepair = /\b(?:was|were|had been|got) (?:fixed|repaired|restored)|\b(?:worked|appeared) again\b/i;
  const cameraReturn = /^\s*(?:it|that (?:camera|device))\b[^.!?;]{0,70}\b(?:disappeared|vanished|stopped appearing|is missing|went missing)\b[^.!?;]{0,35}\bagain\b/i;
  const competingService = /\b(?:vpn|network|router|microphone|printer|scanner|monitor|keyboard|mailbox|application)\b/i;
  const compoundRepair = /\b(?:and|or|both)\b/i;

  const wiredPoint = /\b(?:wall plates?|data outlets?|ethernet outlets?|network wall plates?)\b/gi;
  const wiredFailure = /\blos[et]\w* (?:their |the |its )?(?:internet|connection|link)|\b(?:link|connection)(?: status)? light\b[^.!?;]{0,35}\b(?:dark|off|unlit)|\bno (?:internet|link|connection)\b/i;
  const identityTarget = /\b(?:account verification|verification link|approval code|identity verification)\b[^.!?;]{0,60}\b(?:is |has |was |were |been )*(?:expired|denied|rejected|invalid|blocked)\b/gi;
  const identityClear = /\b(?:verification|approval) (?:now |already )?(?:work\w*|succeeded|passed)|\b(?:no longer|used to be) (?:expired|denied|rejected|invalid|blocked)\b/i;
  const applicationCrash = /\b(?:applications?|apps?|programs?)\s+(?:(?:still|keeps?|again)\s+)*(?:crash\w*|closes unexpectedly)|\bcrash\w* (?:the |my |our )?(?:application|app|program)\b/gi;

  function clauses(text) {
    return text.split(/[.!?;\n]+|\b(?:but|however|whereas|yet)\b/i)
      .map(part => part.trim()).filter(Boolean);
  }

  function addTerms(ledger, id, terms) {
    if (!terms.length) return;
    if (!ledger.has(id)) ledger.set(id, new Set());
    for (const term of terms) ledger.get(id).add(term);
  }

  function merge(ledger, matches) {
    for (const { id, terms } of matches) addTerms(ledger, id, terms);
  }

  function terms(text, expression) {
    return [...text.matchAll(expression)].map(([word]) => word.toLowerCase());
  }

  function recordSymptoms(ledger, clause) {
    if (conditional.test(clause) || recovering.test(clause)) return;

    if (!nonPhysicalScanner.test(clause) && (scanMechanism.test(clause) || unpoweredDevice.test(clause))) {
      addTerms(ledger, "hardware", terms(clause, scanner));
    }
    if (audioInputFailure.test(clause)) addTerms(ledger, "hardware", terms(clause, audioInput));
    if (wiredFailure.test(clause)) addTerms(ledger, "network", terms(clause, wiredPoint));
    if (!identityClear.test(clause)) addTerms(ledger, "access", terms(clause, identityTarget));
    addTerms(ledger, "software", terms(clause, applicationCrash));
  }

  function backgroundTerms(text, background) {
    if (!text.trim()) return;
    const { matches, ignoredMatches } = prior.analyze({ subject: "Reported request", description: text });
    merge(background, [...matches, ...ignoredMatches]);
    for (const clause of clauses(text)) recordSymptoms(background, clause);
  }

  function separateBackground(description, background) {
    const withoutClosedQuotes = description.replace(closedSource, (_, quote) => {
      backgroundTerms(quote, background);
      return "";
    });
    const parts = clauses(withoutClosedQuotes);
    if (!parts.some(part => guidance.test(part))) return withoutClosedQuotes;

    // Guidance can share a sentence with a first person observation. Keep the
    // observation when the request explicitly marks where it starts.
    return parts.flatMap(part => {
      if (!guidance.test(part)) return [part];
      const observation = part.match(observationStart);
      backgroundTerms(part.slice(0, observation?.index ?? part.length), background);
      return observation ? [part.slice(observation.index + observation[0].length)] : [];
    }).join(". ");
  }

  function analyze(fields) {
    // Preserve the existing intake validation and reported details.
    const original = prior.analyze(fields);
    const active = new Map();
    const background = new Map();
    let description = separateBackground(fields.description, background);
    let observations = clauses(description);
    const error = typeof fields.error === "string" ? fields.error : "";

    // An ambiguous return does not make one of several formerly repaired
    // services active just because its old name already has a routing rule.
    const unclearRepairs = new Set();
    for (const [index, clause] of observations.entries()) {
      const earlier = observations[index - 1];
      if (!earlier || !cameraReturn.test(clause) || !earlierRepair.test(earlier)) continue;
      const devices = terms(earlier, camera);
      if (!devices.length) continue;
      if (!competingService.test(earlier)) {
        addTerms(active, "hardware", devices);
      } else if (compoundRepair.test(earlier)) {
        backgroundTerms(earlier, background);
        addTerms(background, "hardware", devices);
        unclearRepairs.add(index - 1);
      }
    }
    if (unclearRepairs.size) {
      observations = observations.filter((_, index) => !unclearRepairs.has(index));
      description = observations.join(". ");
    }
    for (const clause of [...clauses(fields.subject), ...observations, ...clauses(error)]) {
      recordSymptoms(active, clause);
    }

    if (description === fields.description && !active.size) return original;
    const updated = description === fields.description ? original :
      prior.analyze({ ...fields, description: description.trim() || "See the reported request." });
    merge(active, updated.matches);
    merge(background, updated.ignoredMatches);
    const matches = categories.flatMap(({ id, label }) => active.has(id)
      ? [{ id, label, terms: [...active.get(id)] }] : []);
    const ignoredMatches = categories.flatMap(({ id, label }) => {
      const kept = [...(background.get(id) ?? [])].filter(term => !active.get(id)?.has(term));
      return kept.length ? [{ id, label, terms: kept }] : [];
    });
    const suggestedCategory = matches.length === 1 ? matches[0].id : null;
    const status = matches.length === 0 ? "unrecognized" : matches.length === 1 ? "suggested" : "ambiguous";
    const result = { suggestedCategory, status, matches, ignoredMatches, reported: original.reported };
    return { ...result, questions: baseline.questionsFor(result) };
  }

  const api = { analyze };
  if (node) module.exports = api;
  else root.TicketTriageSymptoms = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
