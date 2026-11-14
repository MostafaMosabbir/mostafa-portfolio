(function (root) {
  "use strict";

  const node = typeof module !== "undefined" && module.exports;
  const baseline = node ? require("./triage.js") : root.TicketTriage;
  const context = node ? require("./routing-context.js") : root.TicketTriageContext;
  const observed = node ? require("./routing-observed.js") : root.TicketTriageObserved;
  if (!baseline || !context || !observed) return;

  const categories = baseline.categories.filter(({ id }) => id !== "other");
  const closedRecord = /\b(?:closed|resolved|completed|fixed)\s+(?:support\s+)?(?:ticket|incident|case|report)\s+(?:(?:from|on|dated)\s+[^.!?;“”"\n]{1,45}?\s+)?(?:said|read|reported|showed|contained|recorded|logged)\s*[“"]([^”"\n]+)[”"]/gi;
  const checklistAdvice = /^(?:the\s+|a\s+|our\s+)?(?:support\s+|troubleshooting\s+)?checklist\s+(?:says?|said|suggests?|suggested|recommends?|recommended|advises?|advised)\s+(?:to\s+)?[“"]?(?:check(?:ing)?|test(?:ing)?|try(?:ing)?|inspect(?:ing)?|verify|verifying|reset(?:ting)?|look(?:ing)?|if|when)\b/i;
  const reportedTail = /,?\s+and\s+(?=(?:i|we)\s+(?:saw|heard|confirmed|observed|tested|checked|tried|found|noticed)\b)/i;
  const uncertain = /\b(?:if|whether|may|might|perhaps|supposedly|should)\b/i;
  const noCurrentLockout = /\b(?:never|no longer|last week|last month|in the past|used to|locked before)\b/i;
  const accountLockout = /\baccount\s+(?:(?:has|have)\s+been|is now|got|was just)\s+(?:temporarily\s+)?locked(?: out)?\b/gi;
  const scannerDevice = /\b(?:(?:document|flatbed|barcode|usb|office)\s+)?scanner\b/gi;
  const scannerFault = /\b(?:stuck(?: on| at)?[^.;!?]{0,45}\b(?:calibration|warmup)|(?:won['’]t|will not|doesn['’]t|does not|cannot) (?:scan|feed|power on|calibrate)|(?:stops?|stopped) (?:scanning|feeding)|paper jam|no power|freez(?:es|ing)|calibration (?:fail(?:s|ed)?|never completes))\b/i;
  const inactiveScanner = /\b(?:was repaired|is fixed|not stuck|no longer (?:stuck|jamming)|software scanner|security scanner|virus scanner)\b/i;
  const wiredDevice = /\b(?:ethernet sockets?|(?:wired|ethernet) connections?|network outlets?|network sockets?)\b/gi;
  const wiredFault = /\b(?:fails?|failed|los(?:e|es|t) (?:its |their |the )?(?:(?:wired|ethernet) )?(?:connection|link|access)|(?:drops?|disconnected) (?:the|its|their) (?:link|connection)|no (?:link|connection|signal)|stays? offline|does not work|doesn['’]t work)\b/i;
  const referringPronoun = /^\s*(?:it|that (?:device|service)|this (?:device|service))\b/i;
  const repeatFault = /\b(?:miss(?:es|ed|ing)|skips?|repeats?|drops?|fail\w*|stops?|stopped|reject\w*|freez\w*|crash\w*|stalls?)\b.*\bagain\b/i;
  const priorRepair = /\b(?:(?:was|were|had been|is|got) (?:already )?(?:fixed|repaired|resolved|restored)|worked (?:again|after))\b/i;
  const identityError = /\b(?:verification|access|security|authentication|one[ -]time|two[ -]factor) code\b[^.!?]{0,35}\b(?:expired|invalid|rejected|incorrect)\b/i;
  const genericScreen = /\b(?:first|second|next|last) screen\b/gi;
  const physicalDisplayEvidence = /\b(?:hdmi|displayport|external display|monitor|no signal|flicker\w*|backlight)\b/i;

  function clauses(text) {
    return text.split(/[.!?;\n]+|\b(?:but|however|whereas|yet)\b/i)
      .map(part => part.trim()).filter(Boolean);
  }

  function addTerms(destination, id, terms) {
    if (!terms.length) return;
    if (!destination.has(id)) destination.set(id, new Set());
    for (const term of terms) destination.get(id).add(term);
  }

  function recordMatches(destination, matches) {
    for (const { id, terms } of matches) addTerms(destination, id, terms);
  }

  function evidenceFor(text) {
    if (!text.trim()) return [];
    const { matches, ignoredMatches } = context.analyze({ subject: "Reported request", description: text });
    return [...matches, ...ignoredMatches];
  }

  // A dated closed record and a checklist describe context. Keep direct
  // observations in the same sentence when the requester marks them as such.
  function removeBackground(text, background) {
    const withoutRecords = text.replace(closedRecord, (_, message) => {
      recordMatches(background, evidenceFor(message));
      return "";
    });
    const parts = clauses(withoutRecords);
    if (!parts.some(part => checklistAdvice.test(part))) return withoutRecords;

    return parts.flatMap(part => {
      if (!checklistAdvice.test(part)) return [part];
      const observation = part.match(reportedTail);
      const start = observation?.index ?? part.length;
      recordMatches(background, evidenceFor(part.slice(0, start)));
      return observation ? [part.slice(start + observation[0].length)] : [];
    }).join(". ");
  }

  function matchTerms(text, pattern) {
    return [...text.matchAll(pattern)].map(([term]) => term.toLowerCase());
  }

  function addDirectEvidence(signals, subject, description, error) {
    const request = [...clauses(subject), ...clauses(description), ...clauses(error)]
      .flatMap(part => part.split(/,?\s+and\s+(?=(?:the|my|our|it|i|we)\b)/i));
    for (const part of request) {
      if (uncertain.test(part)) continue;
      if (!noCurrentLockout.test(part)) addTerms(signals, "access", matchTerms(part, accountLockout));
      if (scannerFault.test(part) && !inactiveScanner.test(part)) addTerms(signals, "hardware", matchTerms(part, scannerDevice));
      if (wiredFault.test(part)) addTerms(signals, "network", matchTerms(part, wiredDevice));
    }

    // Resolve a recurrence only when the nearest repair names one category.
    let preceding = "";
    for (const part of clauses(description)) {
      if (referringPronoun.test(part) && repeatFault.test(part) && priorRepair.test(preceding) && !uncertain.test(part)) {
        const service = new Map();
        recordMatches(service, evidenceFor(preceding));
        if (service.size === 1) {
          for (const [id, terms] of service) addTerms(signals, id, [...terms]);
        }
      }
      preceding = part;
    }
  }

  function analyze(fields) {
    const original = observed.analyze(fields);
    const background = new Map();
    const direct = new Map();
    const description = removeBackground(fields.description, background);
    const error = typeof fields.error === "string" ? fields.error : "";
    let subject = fields.subject;

    // A numbered screen can be an application step. Keep actual hardware
    // observations wherever they appear, but defer this title cue to the error.
    if (identityError.test(error) && !physicalDisplayEvidence.test(subject)) {
      subject = subject.replace(genericScreen, term => {
        addTerms(background, "hardware", [term.toLowerCase()]);
        return "";
      });
    }
    addDirectEvidence(direct, subject, description, error);
    const changed = subject !== fields.subject || description !== fields.description;
    if (!changed && direct.size === 0) return original;

    const updated = changed ? observed.analyze({
      ...fields, subject: subject.trim() || "Reported request",
      description: description.trim() || "See the reported request."
    }) : original;
    recordMatches(direct, updated.matches);
    recordMatches(background, updated.ignoredMatches);

    const matches = categories.flatMap(({ id, label }) => direct.has(id)
      ? [{ id, label, terms: [...direct.get(id)] }] : []);
    const ignoredMatches = categories.flatMap(({ id, label }) => {
      const terms = [...(background.get(id) ?? [])].filter(term => !direct.get(id)?.has(term));
      return terms.length ? [{ id, label, terms }] : [];
    });
    const result = {
      suggestedCategory: matches.length === 1 ? matches[0].id : null,
      status: matches.length === 0 ? "unrecognized" : matches.length === 1 ? "suggested" : "ambiguous",
      matches, ignoredMatches, reported: original.reported
    };
    return { ...result, questions: baseline.questionsFor(result) };
  }

  const api = { analyze };
  if (node) module.exports = api;
  else root.TicketTriageIndependent = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
