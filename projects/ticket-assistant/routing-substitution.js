(function (root) {
  "use strict";

  const node = typeof module !== "undefined" && module.exports;
  const baseline = node ? require("./triage.js") : root.TicketTriage;
  const prior = node ? require("./routing-sequence.js") : root.TicketTriageSequence;
  if (!baseline || !prior) return;

  const categories = baseline.categories.filter(({ id }) => id !== "other");
  const sentence = /(?:[“"][^”"\r\n]*[”"]|[^.!?;\r\n“"]+|[“"])+/g;
  const quotedEnd = /([.!?][”"])(?=\s+[A-Z])/g;
  const period = "(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|yesterday|last week|last month)";
  const datedPossessive = new RegExp("\\b" + period + "['’]s\\s+", "i");
  const historicalStatus = /\b(?:old|prior|previous|earlier|closed|resolved|completed)\b/i;
  const record = /\b(?:ticket|case|incident|note|record|request|report)\b/i;
  const closure = /\b(?:closed|resolved|completed|fixed)\b/i;
  const closureUncertain = /\b(?:not|never|might|may|should|cannot|could not) (?:yet |be |have been )?(?:closed|resolved|completed|fixed)\b/i;
  const quoteAttribution = /\b(?:said|says|reported|recorded|read|showed|logged|quoted)\s*[“"][^”"]+[”"]/i;
  const uncertainReference = /\b(?:do not know|don['’]t know|unsure|not sure|cannot tell|can['’]t tell|(?:did not|didn['’]t) (?:write down|record|remember)|(?:cannot|can['’]t) (?:identify|say))\b[^.!?;]{0,42}\b(?:which|what)\b/i;
  const unnamedFault = /\b(?:it|this|that|the same thing) (?:stops?|stopped|fails?|failed|quit|went wrong|broke|happened)\b/i;
  const directCurrent = /\b(?:right now|currently|today\b[^.!?;]{0,22}\b(?:shows?|says?|displays?)|now (?:shows?|says?|displays?))\b/i;
  const observedContrast = /\b(?:but|however|whereas|yet|and now|and today)\b/i;
  const device = /\b(?:(?:(?:label|card|barcode|badge|handheld|ticket|inventory) )?reader|(?:(?:label|barcode|document|handheld|flatbed|usb) )?scanner|(?:(?:label|receipt|ticket|training) )?printer)\b/gi;
  const nonPhysicalDevice = /\b(?:vulnerability|malware|port|network|software|security|virus) scanner|\b(?:pdf|screen|ebook|browser) reader\b/i;
  const referencesDevice = /^(?:it|the device|this device|that device|the (?:startup|power|ready) (?:light|indicator|screen))\b/i;
  const bootObservation = /\b(?:startup|boot|initializ\w*|powers? on|powering on|switched on|turn(?:ed|ing)? on|computer (?:is )?(?:off|shut down)|only (?:to )?power)\b/i;
  const incompleteStartup = /\b(?:never|cannot|can['’]t|does not|doesn['’]t|will not|won['’]t) (?:reach(?:es)?|show(?:s)?|display(?:s)?|get(?:s)? to|advances? to)\b[^.!?;]{0,48}\b(?:ready (?:indicator|light|symbol|state|screen)|reading menu|home (?:screen|menu|page))\b|\b(?:ready (?:indicator|light|symbol|state|screen)|reading menu|home (?:screen|menu|page))\b[^.!?;]{0,30}\b(?:never (?:appears?|shows?|lights? up|changes?)|does not (?:appear|show|light up))\b/i;
  const peripheralSignal = /\b(?:status|power|ready) (?:light|indicator|lamp)\b/i;
  const stalledDuringStartup = /\b(?:never changes?|does not change|doesn['’]t change|stays? (?:blinking|flashing|amber|red)|keeps? (?:blinking|flashing)|never (?:stops? blinking|turns? green))\b/i;
  const healthyDevice = /\b(?:now (?:reaches?|shows?|loads?|displays?)|no longer (?:stays?|hangs?|stuck|freez\w*)|was (?:fixed|repaired|restored)|works? normally now)\b/i;
  const mayBeDevice = /\b(?:might|may|possibly|if|whether)\b/i;
  const deviceBoundary = /^\s*(?:separately|meanwhile|a different (?:device|problem|computer)|in another (?:room|office|department))\b|\b(?:application|program|app|vpn|network|mailbox|account)\b/i;
  const app = /\b(?:application|program|app|software|driver)\b/gi;
  const appMissingDevice = /\b(?:no (?:reader|scanner|printer|device) (?:found|seen|detected|recognized)|(?:cannot|can['’]t|does not|doesn['’]t) (?:see|find|detect|recognize) (?:the |a |its |this |that |our )?(?:reader|scanner|printer|device)|(?:reader|scanner|printer|device) (?:not (?:found|detected|recognized)|is missing))\b/i;
  const positiveDetection = /\b(?:(?:but|although|however)\s+)?(?:(?:immediately|successfully|correctly|still)\s+)?(?:detect(?:s|ed)?|recognize(?:s|d)?|finds?|sees?|works? with|can use|opens? with)\b[^.!?;]{0,40}\b(?:spare|replacement|another|different|other)\s+(?:one|reader|scanner|printer|device)\b/i;
  const uncertainDetection = /\b(?:might|may|should|could potentially|cannot|can['’]t|never|not)\b[^.!?;]{0,27}\b(?:detect\w*|recogniz\w*|find|see|work)\b/i;
  const programFault = /\b(?:application|program|app|software|editor)\b[^.!?;]{0,38}\b(?:freez\w*|hangs?|crash\w*|exits?|quits?|vanish\w*|shuts? down|closes?)\b/i;
  const faultWithoutEquipment = /\b(?:on|from|using) (?:a |the |another |other |different )*(?:computer|workstation|machine|laptop|desktop) (?:that )?(?:has no|has never had|does not have|doesn['’]t have|without) (?:a |the )?(?:scanner|reader|printer|device)(?: attached| connected)?\b/i;
  const successfulPrint = /\b(?:makes?|prints?|printed|produces?|produced|runs?|ran|passes?|passed) (?:a |its |the )?clean test page\b/i;
  const authDiagnostic = /\b(?:verification|authentication)\s+(?:was |is |has been )?(?:rejected|failed|denied)\b[^.!?;]{0,32}\b(?:because|after)\b[^.!?;]{0,35}\b(?:account approval|approval request|sign[ -]?in approval|identity check)\b[^.!?;]{0,17}\b(?:expired|timed out|was denied|was rejected)\b/gi;
  const identityOkay = /\b(?:no longer|not rejected|not failed|no (?:verification|authentication) (?:error|failure))\b/i;
  const categoryTerms = [
    ["hardware", /\b(?:(?:label|badge|card|receipt|ticket|barcode) )?(?:reader|printer|scanner)\b|\b(?:device|paper jam|monitor|laptop)\b/gi],
    ["access", /\b(?:password|log[ -]?in|sign[ -]?in|authentication|mfa|approval)\b/gi],
    ["email", /\b(?:mailbox|outlook|email|inbox|calendar)\b/gi],
    ["network", /\b(?:vpn|network|wireless|ethernet|internet)\b/gi],
    ["software", /\b(?:program|app|software|application|installer)\b/gi]
  ];

  function sentences(text) {
    return (text.replace(quotedEnd, "$1\n").match(sentence) ?? []).map(part => part.trim()).filter(Boolean);
  }

  function terms(text, pattern) {
    return [...text.matchAll(pattern)].map(([term]) => term.toLowerCase());
  }

  function add(ledger, id, found) {
    if (!found.length) return;
    if (!ledger.has(id)) ledger.set(id, new Set());
    for (const term of found) ledger.get(id).add(term);
  }

  function merge(ledger, matches) {
    for (const { id, terms: found } of matches) add(ledger, id, found);
  }

  function setAside(text, ledger) {
    const known = prior.analyze({ subject: "Reported request", description: text });
    merge(ledger, [...known.matches, ...known.ignoredMatches]);
    for (const [id, pattern] of categoryTerms) add(ledger, id, terms(text, pattern));
  }

  function cleanHistory(parts, background) {
    return parts.flatMap((part, index) => {
      const looksHistorical = (datedPossessive.test(part) || historicalStatus.test(part)) && record.test(part);
      if (looksHistorical && closure.test(part) && quoteAttribution.test(part) &&
        !closureUncertain.test(part) && !directCurrent.test(part) && !observedContrast.test(part)) {
        setAside(part, background);
        return [];
      }
      const following = parts.slice(index + 1, index + 3).join(" ");
      if (looksHistorical && unnamedFault.test(following) && uncertainReference.test(following) &&
        categoryTerms.filter(([, pattern]) => terms(part, pattern).length > 0).length > 1) {
        setAside(part, background);
        return [];
      }
      if (successfulPrint.test(part) && !programFault.test(part)) {
        add(background, "hardware", terms(part, device));
        return [];
      }
      const omission = part.match(faultWithoutEquipment);
      if (programFault.test(part) && omission) {
        add(background, "hardware", terms(omission[0], device));
        return [part.replace(faultWithoutEquipment, "")];
      }
      return [part];
    });
  }

  function startupFaults(parts, active) {
    let anchor = null;
    for (const part of parts) {
      const named = nonPhysicalDevice.test(part) ? [] : [...new Set(terms(part, device))];
      if (healthyDevice.test(part) || mayBeDevice.test(part) || named.length > 1 || deviceBoundary.test(part)) {
        anchor = null;
        continue;
      }
      const startup = bootObservation.test(part);
      const stalled = incompleteStartup.test(part) || peripheralSignal.test(part) && stalledDuringStartup.test(part);
      if (named.length === 1) {
        anchor = { name: named[0], startup, stalled };
      } else if (anchor && referencesDevice.test(part)) {
        anchor.startup ||= startup;
        anchor.stalled ||= stalled;
      } else {
        anchor = null;
      }
      if (anchor?.startup && anchor.stalled) add(active, "hardware", [anchor.name]);
    }
  }

  function replacementEvidence(part) {
    if (uncertainDetection.test(part)) {
      const afterContrast = part.split(/\b(?:but|however|whereas|yet)\b/i).at(-1);
      if (afterContrast === part || uncertainDetection.test(afterContrast)) return "";
      return afterContrast.match(positiveDetection)?.[0] ?? "";
    }
    return part.match(positiveDetection)?.[0] ?? "";
  }

  function deviceKinds(text) {
    return new Set(terms(text, device).map(label => label.split(" ").at(-1)));
  }

  function removeCoupledApp(subject, parts, active, background) {
    const failingKinds = deviceKinds([...(active.get("hardware") ?? [])].join(". "));
    if (!failingKinds.size) return { subject, kept: parts };
    const detections = parts.map(replacementEvidence).filter(Boolean);
    const linkedKinds = new Set();
    for (const part of parts) {
      const missing = part.match(appMissingDevice)?.[0];
      if (!missing || !terms(part, app).length) continue;
      for (const kind of deviceKinds(missing)) {
        const replacementMatches = detections.some(evidence =>
          deviceKinds(evidence).has(kind) || /\b(?:spare|replacement|another|different|other) one\b/i.test(evidence) &&
            parts.some(text => text.includes(evidence) && text.includes(missing)));
        if (failingKinds.has(kind) && replacementMatches) linkedKinds.add(kind);
      }
    }
    if (!linkedKinds.size) return { subject, kept: parts };

    // Replacement evidence and a local startup failure support the device
    // route regardless of which observation was described first.
    function describesDeviceLink(text) {
      const relevant = [text.match(appMissingDevice)?.[0] ?? "", replacementEvidence(text)];
      return relevant.some(chunk => [...deviceKinds(chunk)].some(kind => linkedKinds.has(kind)));
    }
    const kept = parts.flatMap(part => {
      if (programFault.test(part)) return [part];
      if (describesDeviceLink(part)) {
        add(background, "software", terms(part, app));
        return [];
      }
      return [part];
    });
    if (!describesDeviceLink(subject) || programFault.test(subject)) return { subject, kept };
    add(background, "software", terms(subject, app));
    return { subject: subject.replace(app, "").replace(/\s+/g, " ").trim(), kept };
  }

  function analyze(fields) {
    const original = prior.analyze(fields);
    const active = new Map();
    const background = new Map();
    const parts = sentences(fields.description);
    const observations = cleanHistory(parts, background);
    startupFaults(observations, active);
    const { subject, kept } = removeCoupledApp(fields.subject, observations, active, background);
    for (const part of [...kept, typeof fields.error === "string" ? fields.error : ""]) {
      if (!identityOkay.test(part)) add(active, "access", terms(part, authDiagnostic));
    }
    const changed = subject !== fields.subject || kept.length !== parts.length ||
      kept.some((part, index) => part !== parts[index]);
    if (!changed && !active.size) return original;

    const upstream = changed ? prior.analyze({
      ...fields,
      subject: subject || "Reported request",
      description: kept.join(". ") || "See the reported request."
    }) : original;
    merge(active, upstream.matches);
    merge(background, upstream.ignoredMatches);
    const matches = categories.flatMap(({ id, label }) => active.has(id)
      ? [{ id, label, terms: [...active.get(id)] }] : []);
    const ignoredMatches = categories.flatMap(({ id, label }) => {
      const ignored = [...(background.get(id) ?? [])].filter(term => !active.get(id)?.has(term));
      return ignored.length ? [{ id, label, terms: ignored }] : [];
    });
    const suggestedCategory = matches.length === 1 ? matches[0].id : null;
    const status = matches.length === 0 ? "unrecognized" : matches.length === 1 ? "suggested" : "ambiguous";
    const result = { suggestedCategory, status, matches, ignoredMatches, reported: original.reported };
    return { ...result, questions: baseline.questionsFor(result) };
  }

  const api = { analyze };
  if (node) module.exports = api;
  else root.TicketTriageSubstitution = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
