(function (root) {
  "use strict";

  const node = typeof module !== "undefined" && module.exports;
  const baseline = node ? require("./triage.js") : root.TicketTriage;
  const context = node ? require("./routing-context.js") : root.TicketTriageContext;
  if (!baseline || !context) return;

  const uncertainRecovery = /\b(?:not|never|cannot|can't|may|might|perhaps|seems?|supposed|only|briefly|sometimes|intermittently|until|if|hoping|maybe|thought)\b/i;
  const successfulUse = /\b(?:(?:can|able to) (?:successfully )?(?:sign[ -]?in|log[ -]?in)|(?:sign[ -]?in|log[ -]?in|opens?|connects?|prints?) (?:normally|fine|successfully)|(?:signed|logged) in (?:normally|successfully))\b/i;
  const recovered = /\b(?:(?:is|are|was|were|been|got) (?:already |fully |now |back to )?(?:fixed|restored|resolved|stable|fine|ok|okay|normal|working)|worked (?:again|after)|back to normal)\b/i;
  const currentException = /\b(?:still (?:fails?|failing|rejects?|unavailable|broken|cannot|can't)|no longer (?:works?|opens?|prints?|connects?))\b/i;
  const pronoun = /^\s*(?:it|(?:that|this) (?:issue|problem|service|device)|both(?: (?:issues|problems))?)\b/i;
  const recurrence = /\b(?:dropped|disconnected|stopped|failed|froze|crashed|returned|came back|started again)\b.*\b(?:again|later|still|now)\b|\b(?:failed|dropped|disconnected|froze|crashed) again\b/i;

  // A quotation is background only when the request explicitly places it in
  // an earlier closed ticket. Error messages quoted for the current issue stay.
  const closedQuote = /\b(?:(?:last|old|prior|previous|earlier) (?:ticket|case|incident|report)(?: from [^.!?;“"\n]{1,45})?) (?:said|read|reported|showed)\s*[“"]([^”"\n]+)[”"](?=\s+(?:(?:and|which)\s+)?(?:it\s+)?(?:was|is|has been)\s+(?:already\s+)?(?:closed|resolved|fixed)\b)/gi;

  function mergeMatches(matches, added) {
    for (const { id, label, terms } of added) {
      if (!matches.has(id)) matches.set(id, { id, label, terms: new Set() });
      for (const term of terms) matches.get(id).terms.add(term);
    }
  }

  function termsIn(text) {
    const result = context.analyze({ subject: "Request", description: text });
    const matches = new Map();
    mergeMatches(matches, [...result.matches, ...result.ignoredMatches]);
    return [...matches.values()];
  }

  function markBackground(clause, background) {
    clause.background = true;
    mergeMatches(background, clause.mentions);
  }

  function readSequence(description, background) {
    const withoutOldQuotes = description.replace(closedQuote, (quotedReport, quote) => {
      if (quote.trim()) mergeMatches(background, termsIn(quote));
      return "";
    });
    const clauses = withoutOldQuotes.split(/[.!?;\n]+/).flatMap((sentence, index) =>
      sentence.split(/\b(?:but|however|although|whereas|while|yet)\b|,?\s+and\s+(?=(?:i|we|our|my|the|it|that|this|both)\b)/i)
        .map(text => text.trim()).filter(Boolean)
        .map(text => ({ text, sentence: index, mentions: termsIn(text), background: false })));

    let preceding;
    const activeAgain = new Map();
    for (const [index, clause] of clauses.entries()) {
      const mayReferBack = !clause.mentions.length && pronoun.test(clause.text);
      const refersToOne = mayReferBack && preceding?.mentions.length === 1;
      if (!uncertainRecovery.test(clause.text) && !currentException.test(clause.text) &&
          (recovered.test(clause.text) || successfulUse.test(clause.text))) {
        if (mayReferBack && /^both\b/i.test(clause.text) && preceding) {
          const previousSentence = clauses.slice(0, index).filter(item => item.sentence === preceding.sentence);
          const serviceCount = new Set(previousSentence.flatMap(item => item.mentions.map(({ id }) => id))).size;
          if (serviceCount === 2) previousSentence.forEach(item => markBackground(item, background));
        } else if (refersToOne) {
          markBackground(preceding, background);
        }
        markBackground(clause, background);
      } else if (recurrence.test(clause.text)) {
        mergeMatches(activeAgain, refersToOne ? preceding.mentions : clause.mentions);
      }
      preceding = clause;
    }
    const changed = withoutOldQuotes !== description || clauses.some(clause => clause.background);
    return {
      description: changed ? clauses.filter(clause => !clause.background).map(({ text }) => text).join(". ") : description,
      activeAgain
    };
  }

  function analyze(fields) {
    const original = context.analyze(fields);
    const background = new Map();
    const sequence = readSequence(fields.description, background);
    if (sequence.description === fields.description && !sequence.activeAgain.size) return original;

    // Remove from the title only the actual terms that have clearer context
    // in the description. Terms for other devices or services stay available.
    let title = fields.subject;
    for (const { terms } of background.values()) {
      for (const term of terms) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        title = title.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "");
      }
    }
    const updated = context.analyze({
      ...fields,
      subject: title.trim() || "Request",
      description: sequence.description.trim() || "See the reported request."
    });
    const active = sequence.activeAgain;
    mergeMatches(active, updated.matches);
    mergeMatches(background, updated.ignoredMatches);
    const matches = [...active.values()].map(match => ({ ...match, terms: [...match.terms] }));
    const ignoredMatches = [...background.values()].map(match => ({
      ...match,
      terms: [...match.terms].filter(term => !active.get(match.id)?.terms.has(term))
    })).filter(match => match.terms.length);
    const result = {
      suggestedCategory: matches.length === 1 ? matches[0].id : null,
      status: matches.length === 0 ? "unrecognized" : matches.length === 1 ? "suggested" : "ambiguous",
      matches,
      ignoredMatches,
      reported: original.reported
    };
    return { ...result, questions: baseline.questionsFor(result) };
  }

  const api = { analyze };
  if (node) module.exports = api;
  else root.TicketTriageRefined = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
