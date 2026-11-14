(function (root) {
  "use strict";

  const node = typeof module !== "undefined" && module.exports;
  const baseline = node ? require("./triage.js") : root.TicketTriage;
  const context = node ? require("./routing-context.js") : root.TicketTriageContext;
  const refined = node ? require("./routing-refined.js") : root.TicketTriageRefined;
  if (!baseline || !context || !refined) return;

  const categories = baseline.categories.filter(({ id }) => id !== "other");
  const oldQuote = /\b(?:closed|resolved|completed|fixed)\s+(?:support\s+)?(?:ticket|incident|case|report)\s+(?:said|read|reported|showed|contained|recorded|logged)\s*[“"]([^”"\n]+)[”"]/gi;
  const instructions = /^(?:the\s+|a\s+|our\s+)?(?:guide|manual|runbook|help article|instructions|documentation|troubleshooting steps)\s+(?:says?|advises?|recommends?|suggests?|tells?\s+(?:me|us|users)|calls for)\s+(?:(?:that|to)\s+)?[“"]?(?:(?:check|test|restart|reset|inspect|review|connect|reconnect|confirm)(?:ing)?|try(?:ing)?|verif(?:y|ying)|look(?:ing)?|if|when)\b/i;
  const qualified = /\b(?:if|whether|may|might|perhaps|supposedly|reportedly|should)\b/i;
  const failure = /\b(?:affected|fails?|failed|broken|down|no link|no access|no connection|los(?:es|t) (?:its |the )?(?:link|access|connection)|drops?|disconnects?|refuses?|does not work|doesn['’]t work)\b/i;
  const wiredPort = /\b(?:wall jacks?|ethernet jacks?|data jacks?|ethernet ports?|wired ports?|switch ports?)\b/gi;
  const lockout = /\baccount\s+(?:is|remains?)\s+(?:temporarily\s+)?locked(?: out)?\b/gi;
  const audioSymptom = /\b(headsets?|headphones?|microphones?|speakers?)\b\s+(?:(?:still|now|keeps?|sometimes)\s+)*(?:los(?:e|es|t|ing) (?:its )?(?:sound|audio)|cuts? out|fades? out|stops? (?:working|playing)|is silent)\b/gi;
  const pronoun = /^(?:it|this (?:device|service|connection|issue)|that (?:device|service|connection|issue))\b/i;
  const returnedSymptom = /\b(?:repeats?|repeating|dropping|drops?|disconnect\w*|fail\w*|freez\w*|froze|crash\w*|stalls?|stopp?ed|cuts? out|los(?:es|t|ing)|came back|returned)\b.*\b(?:again|back)\b/i;
  const observedRecovery = /\b(?:(?:was|were|is|got|had been)\s+(?:already\s+)?(?:fixed|repaired|restored|resolved)|worked)\b/i;

  function addMatches(destination, matches) {
    for (const { id, terms } of matches) {
      if (!destination.has(id)) destination.set(id, new Set());
      for (const term of terms) destination.get(id).add(term);
    }
  }

  function routeMatches(text) {
    const { matches, ignoredMatches } = context.analyze({ subject: "Reported request", description: text });
    const mentioned = new Map();
    addMatches(mentioned, [...matches, ...ignoredMatches]);
    return [...mentioned].map(([id, terms]) => ({ id, terms }));
  }

  function clauses(text) {
    return text.split(/(?:[.!?;\n]+|\b(?:but|however|whereas|yet)\b)/i)
      .map(part => part.trim()).filter(Boolean);
  }

  // Guidance describes what someone could try. Quoted text from a closed
  // incident describes earlier work. Neither supplies an observed symptom.
  function separateBackground(text, background) {
    const withoutQuotes = text.replace(oldQuote, (quoteWithSource, quote) => {
      if (quote.trim()) addMatches(background, routeMatches(quote));
      return "";
    });
    const parts = clauses(withoutQuotes);
    const hasAdvice = parts.some(part => instructions.test(part));
    if (!hasAdvice) return withoutQuotes;

    return parts.flatMap(part => {
      if (!instructions.test(part)) return [part];
      // An explicit observation can follow advice in the same sentence.
      const observation = part.search(/,?\s+and\s+(?=(?:i|we)\s+(?:saw|heard|confirmed|observed|tested|checked|tried|found|noticed)\b)/i);
      const advice = observation === -1 ? part : part.slice(0, observation);
      addMatches(background, routeMatches(advice));
      return observation === -1 ? [] : [part.slice(observation).replace(/^,?\s+and\s+/i, "")];
    }).join(". ");
  }

  function directMatches(subject, description, error) {
    const observed = new Map();
    const observations = [...clauses(subject), ...clauses(description), ...clauses(error)]
      .flatMap(part => part.split(/,?\s+and\s+(?=(?:the|my|our|it|i|we)\b)/i));
    for (const part of observations) {
      if (qualified.test(part)) continue;
      const account = [...part.matchAll(lockout)].map(([term]) => term.toLowerCase());
      const audio = [...part.matchAll(audioSymptom)].map(([, device]) => device.toLowerCase());
      const ports = failure.test(part) ? [...part.matchAll(wiredPort)].map(([term]) => term.toLowerCase()) : [];
      if (account.length) addMatches(observed, [{ id: "access", terms: account }]);
      if (audio.length) addMatches(observed, [{ id: "hardware", terms: audio }]);
      if (ports.length) addMatches(observed, [{ id: "network", terms: ports }]);
    }

    // Only link a return to the immediately preceding recovery when that
    // clause identifies exactly one service. Keep unclear references for review.
    let preceding = "";
    for (const part of clauses(description)) {
      if (pronoun.test(part) && returnedSymptom.test(part) && observedRecovery.test(preceding) && !qualified.test(part)) {
        const antecedents = routeMatches(preceding);
        if (antecedents.length === 1) addMatches(observed, antecedents);
      }
      preceding = part;
    }
    return observed;
  }

  function analyze(fields) {
    const original = refined.analyze(fields);
    const background = new Map();
    const description = separateBackground(fields.description, background);
    const signals = directMatches(fields.subject, description, typeof fields.error === "string" ? fields.error : "");
    if (description === fields.description && signals.size === 0) return original;

    const updated = description === fields.description ? original :
      refined.analyze({ ...fields, description: description.trim() || "See the reported request." });
    addMatches(signals, updated.matches);
    addMatches(background, updated.ignoredMatches);
    const matches = categories.flatMap(({ id, label }) => signals.has(id)
      ? [{ id, label, terms: [...signals.get(id)] }] : []);
    const ignoredMatches = categories.flatMap(({ id, label }) => {
      const terms = [...(background.get(id) ?? [])].filter(term => !signals.get(id)?.has(term));
      return terms.length ? [{ id, label, terms }] : [];
    });
    const suggestedCategory = matches.length === 1 ? matches[0].id : null;
    const status = matches.length === 0 ? "unrecognized" : matches.length === 1 ? "suggested" : "ambiguous";
    const result = { suggestedCategory, status, matches, ignoredMatches, reported: original.reported };
    return { ...result, questions: baseline.questionsFor(result) };
  }

  const api = { analyze };
  if (node) module.exports = api;
  else root.TicketTriageObserved = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
