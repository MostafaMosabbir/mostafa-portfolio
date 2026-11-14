(function (root) {
  "use strict";

  const baseline = typeof module !== "undefined" && module.exports ? require("./triage.js") : root.TicketTriage;
  if (!baseline) return;

  // Keep the original matching rules available for comparison. The small
  // vocabulary below adds alternate phrases for the same routing categories.
  const additionalTerms = {
    network: /\b(?:wireless|loses? (?:the )?connection)\b/gi,
    access: /\b(?:(?:verification|access|security|one[ -]time|two[ -]factor) codes?|(?:six|6)[ -]digit code (?:has |is |was )?expired|signing (?:in|into)|logging (?:in|into))\b/gi,
    hardware: /\b(?:external display|second screen|hdmi)\b/gi
  };
  const categories = baseline.categories.filter(({ id }) => id !== "other");
  const symptom = /\b(?:cannot|can['’]t|could not|couldn['’]t|unable|will not|won['’]t|does not|doesn['’]t|did not|didn['’]t|not (?:working|fixed|resolved)|no longer (?:works?|connects?|prints?|opens?)|error|reject\w*|fail\w*|crash\w*|freez\w*|froz\w*|disconnect\w*|drops?|cuts? out|stops?|stopped|unavailable|no signal|no power|shows? no lights|dark|stalls?|flicker\w*|repeats?|expired|locked|denied|hangs?|intermittent\w*|rolls back|stays? pending|loops?|shuts? down)\b/i;
  const noLongerBroken = /\bno longer (?:disconnect\w*|drops?|fail\w*|crash\w*|flicker\w*|freez\w*)\b/gi;
  const working = /\b(?:works?(?! (?:only|sometimes|intermittently)\b)|working (?:normally|fine|again|now)|(?:is|are|was|were|got|been|now) (?:already |fully )?(?:fixed|resolved|restored|finished|complete(?:d)?|working|available again)|(?:fixed|resolved|restored) (?:the|my|our)|back to normal|no (?:problem|issue) with|no (?:[\w-]+ ){0,3}(?:problem|issue|outage)|not (?:an?|the) (?:[\w-]+ ){0,3}(?:problem|issue)|(?:setup|installation) (?:is |was )?(?:done|complete(?:d)?|finished))\b/i;
  const limitedWorking = /\b(?:works?|working) (?:only|sometimes|intermittently)\b/i;
  const qualifiesRecovery = /\b(?:not|never|wasn['’]t|isn['’]t|weren['’]t|aren['’]t) (?:already |fully )?(?:fixed|resolved|restored|finished|complete(?:d)?|working|back to normal)|\b(?:may|might|should|supposed to) (?:be |have been )?(?:fixed|resolved|restored|working)|\b(?:only|briefly|sometimes|intermittently|until|if|hoping|maybe)\b/i;
  const historical = /\b(?:earlier|previous|old|prior|last) (?:ticket|report|issue|case|incident|week|month)\b/i;
  const reference = /^\s*(?:it|which|(?:that|this) (?:issue|problem|device|service)|still)\b/i;
  const deviceSetting = /\b(?:i (?:use|used|am using)|we (?:use|are using)|using|on|from|through|via)\s+(?:(?:my|the|a|an|our|this|work)\s+)*(laptop|desktop)\b/i;
  const deviceSymptom = /\b(?:laptop|desktop) (?:that |which |still |keeps? )?(?:shuts? down|reboots?|freez\w*|froz\w*|crash\w*|won['’]t|will not|doesn['’]t|does not|stopped|is (?:broken|dead)|has no power)\b/i;

  function mentions(clause) {
    const original = new Map(baseline.analyze({ subject: clause, description: clause }).matches
      .map(({ id, terms }) => [id, terms]));
    return categories.flatMap(({ id, label }) => {
      const extra = additionalTerms[id] ? clause.match(additionalTerms[id]) ?? [] : [];
      const terms = [...new Set([...(original.get(id) ?? []), ...extra.map(term => term.toLowerCase())])];
      return terms.length ? [{ id, label, terms }] : [];
    });
  }

  function clauseState(clause) {
    // A clear recovery wins over a historical symptom, but a current failure
    // or a qualified recovery is still evidence for review.
    const withoutOldSymptom = clause.replace(noLongerBroken, "");
    if (withoutOldSymptom !== clause && !symptom.test(withoutOldSymptom)) return "background";
    if (limitedWorking.test(clause) || (qualifiesRecovery.test(clause) && working.test(clause))) return "current";
    if (historical.test(clause) && working.test(clause)) return "background";
    if (symptom.test(clause)) return "current";
    return working.test(clause) ? "background" : "mention";
  }

  function clausesFor(text) {
    return text.split(/[.!?;\n]+|\b(?:but|however|although|whereas|while|yet)\b|,\s*(?=(?:and\b|\b(?:i|we|they|my|our|the)\b))/i)
      .flatMap(clause => {
        const joined = clause.match(/^(.+?)\band\b(.+)$/i);
        return joined && clauseState(joined[1]) !== "mention" && clauseState(joined[2]) !== "mention"
          ? [joined[1], joined[2]] : [clause];
      }).map(clause => clause.trim()).filter(Boolean);
  }

  function addMatches(destination, matches) {
    for (const { id, label, terms } of matches) {
      if (!destination.has(id)) destination.set(id, { id, label, terms: new Set() });
      for (const term of terms) destination.get(id).terms.add(term);
    }
  }

  function collect(text) {
    const signals = { current: new Map(), background: new Map(), mention: new Map() };
    let previous = [];
    for (const clause of clausesFor(text)) {
      const state = clauseState(clause);
      const found = mentions(clause);
      const matches = !found.length && reference.test(clause) && previous.length === 1 ? previous : found;
      const device = deviceSetting.exec(clause)?.[1].toLowerCase();
      for (const match of matches) {
        // An endpoint can be where a service fails without being the fault.
        if (device && match.id === "hardware" && !deviceSymptom.test(clause)) {
          addMatches(signals.background, [{ ...match, terms: [device] }]);
          const otherTerms = match.terms.filter(term => term !== device);
          if (otherTerms.length) addMatches(signals[state], [{ ...match, terms: otherTerms }]);
        } else {
          addMatches(signals[state], [match]);
        }
      }
      if (found.length) previous = found;
    }
    return signals;
  }

  function toMatches(signals) {
    return categories.flatMap(({ id }) => {
      const match = signals.get(id);
      return match?.terms.size ? [{ ...match, terms: [...match.terms] }] : [];
    });
  }

  function analyze(fields) {
    const original = baseline.analyze(fields);
    const title = collect(fields.subject);
    const description = collect(fields.description);
    const error = collect(typeof fields.error === "string" ? fields.error : "");
    const current = new Map();
    const background = new Map();

    addMatches(current, [...description.current.values(), ...error.current.values()]);
    addMatches(current, [...title.current.values()].filter(({ id }) =>
      !description.background.has(id) || current.has(id)));
    addMatches(background, [...title.background.values(), ...description.background.values(), ...error.background.values()]);

    // Bare mentions can route a terse request. A stronger symptom or an
    // explicit account of recovery takes priority over that fallback.
    if (!current.size) {
      addMatches(current, [...title.mention.values(), ...description.mention.values(), ...error.mention.values()]
        .filter(({ id }) => !background.has(id)));
    }
    const matches = toMatches(current);
    const ignoredMatches = toMatches(background).map(match => ({
      ...match,
      terms: match.terms.filter(term => !current.get(match.id)?.terms.has(term))
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
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TicketTriageContext = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
