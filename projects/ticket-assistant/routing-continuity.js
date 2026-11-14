(function (root) {
  "use strict";

  const node = typeof module !== "undefined" && module.exports;
  const baseline = node ? require("./triage.js") : root.TicketTriage;
  const prior = node ? require("./routing-boot.js") : root.TicketTriageBoot;
  if (!baseline || !prior) return;

  const categories = baseline.categories.filter(({ id }) => id !== "other");
  const sentence = /(?:[“"][^”"\r\n]*[”"]|[^.!?;\r\n“"]+|[“"])+/g;
  const quotedEnd = /([.!?][”"])(?=\s+[A-Z])/g;
  const device = /\b(?:(?:inventory|handheld|barcode|bar code|label|document|flatbed|badge|card|ticket)\s+(?:reader|scanner)|scanner|printer|handheld terminal|kiosk|projector|notebook|laptop)\b/gi;
  const softwareScanner = /\b(?:security|virus|vulnerability|port|network|software|malware) scanner\b/i;
  const startupDisplay = /\b(?:wordmark|welcome (?:picture|screen|image|page)|company emblem|logo|splash (?:screen|page)|boot screen|startup screen)\b/i;
  const startupActivity = /\b(?:powers? on|starts? up|(?:turn|switch|power) (?:it|the [\w ]{1,30}) on|comes? on)\b/i;
  const observesStage = /\b(?:shows?|displays?|opens? (?:at|on)|lands? (?:at|on))\b/i;
  const cannotPassStage = /\b(?:stays?|remains?|stuck|freez\w*)\s+(?:at|on|there)|\b(?:never|cannot|can['’]t|will not|won['’]t|does not|doesn['’]t)\s+(?:advances?|gets?|goes?|go|move|moves?|progress(?:es)?|proceed(?:s)?)\s+(?:past|beyond|through)\b/i;
  const startupReference = /^(?:it|this device|the device|its (?:screen|display|logo))\b/i;
  const stillAtStage = /\b(?:still (?:there|stays?|shows?|displays?|remains?)|has (?:been |stayed )?there for|has (?:been |stayed )?on|remains? (?:there|on)|stays? (?:there|on)|never (?:comes?|shows?|loads?|reaches?|opens?) (?:up|on)|has not changed)\b/i;
  const missingHome = /\b(?:home|main) (?:view|screen|menu|page)\b[^.!?;]{0,25}\b(?:never|does not|doesn['’]t|will not|won['’]t) (?:appear|comes? up|load|open|show)|\b(?:never reaches?|cannot reach|no) (?:the )?(?:home|main) (?:view|screen|menu|page)\b/i;
  const healthyStartup = /\b(?:no longer|not stuck|now (?:loads?|reaches?|opens?)|starts? normally|may be stuck|might be stuck)\b/i;
  const newDeviceOrService = /\b(?:other|second|another|replacement|spare)\s+(?:device|reader|scanner|printer|computer|laptop|terminal)|\b(?:vpn|network|wireless|router|internet|mailbox|outlook|application)\b/i;

  const closedRecord = /\b(?:incident|ticket|case|outage|report)\b[^.!?;“"]{0,35}\b(?:is|was|has been|had been) (?:already )?(?:closed|resolved|completed)\b/i;
  const uncertainty = /\b(?:not|never|may|might|should|if|whether) (?:yet )?(?:be |have been )?(?:closed|resolved|completed)\b/i;
  const noteReference = /^(?:its|that (?:incident|case|ticket|report)['’]s|the (?:old|prior|previous|earlier))\s+(?:note|record|entry|log|report)\b/i;
  const currentSource = /\b(?:now (?:shows?|displays?|says?)|current(?:ly)?|right now|todays? (?:message|error))\b/i;
  const guide = /^(?:the |a |an |our )?(?:help (?:article|page|guide)|guide|documentation|instructions|manual|runbook|support article)\s+(?:says?\s+to|recommends?|suggests?|advises?)\b/i;
  const observedTail = /,?\s+and\s+(?=(?:i|we)\s+(?:saw|heard|noticed|observed|confirmed|tested|found|checked)\b)/i;
  const healthyDesktop = /^(?:(?:i|we) can (?:still )?see (?:the rest of|everything else on) (?:my|our|the) (?:desktop|screen|display)|(?:my|our|the) (?:desktop|screen|display) (?:stays? (?:visible|clear|normal)|is still visible))\b/i;
  const hardwareFault = /\b(?:goes? (?:black|blank|dark)|no (?:picture|signal|image)|flicker\w*|fails?|does not show|loses? (?:its )?picture)\b/i;

  const historicNote = /\b(?:yesterday['’]s |earlier |previous |old |prior )(?:note|ticket|record|report|case)\b[^.!?;]{0,31}\b(?:reported|described|mentioned|listed|noted|included)\b/i;
  const multiple = /\b(?:both|two|and|several)\b/i;
  const vagueRecurrence = /\b(?:it|this|that|the same thing) (?:happened|failed|quit|stopped|broke|returned|went wrong) again\b/i;
  const noReferent = /\b(?:(?:cannot|can['’]t|could not|couldn['’]t) (?:say|tell|identify|remember)|(?:do not|don['’]t) know|(?:not sure|unsure))\b[^.!?;]{0,42}\b(?:which|what)\b/i;
  const historicalTopics = [
    ["access", /\b(?:log[ -]?in|sign[ -]?in|password|mfa|authentication)\b/gi],
    ["hardware", /\b(?:display|monitor|printer|scanner|device|keyboard|screen)\b/gi],
    ["network", /\b(?:vpn|wireless|network|connection|internet)\b/gi],
    ["email", /\b(?:outlook|mailbox|email|calendar)\b/gi],
    ["software", /\b(?:application|software|installer|program)\b/gi]
  ];

  const mail = /\b(?:mailbox|outlook|email|mail|inbox|messages?)\b/gi;
  const remote = /\b(?:vpn|(?:remote )?tunnel)\b/i;
  const dependentTime = /\b(?:only when|every time|at the same (?:time|moment)|whenever|when|as soon as|during|once)\b/i;
  const linkFailure = /\b(?:drops?|falls?|disconnect\w*|goes down|(?:loses?|lost)\b[^.!?;]{0,25}\b(?:connection|access|link)|fails?)\b/i;
  const observedTunnelFault = /\b(?:vpn|(?:remote )?tunnel)\s+(?:connection |link |session )?(?:still |also |keeps? )?(?:drops?|disconnect\w*|fails?|goes down)\b|\b(?:loses?|lost)\s+(?:its |the |my |our |their )?(?:vpn|(?:remote )?tunnel)\s+(?:connection|link|session)\b/gi;
  const uncertainTunnelFault = /\b(?:if|whether|might|may|should|no longer|never|did not|does not|doesn['’]t)\b[^.!?;]{0,33}\b(?:vpn|tunnel|drop\w*|disconnect\w*|lose|loses)\b/i;
  const tunnelRecovery = /\b(?:works? normally|working normally|works? again|now (?:works?|connects?)|is (?:fixed|back|stable)|was (?:fixed|restored)|no longer (?:drops?|disconnect\w*))\b/i;
  const pastTunnel = /\b(?:yesterday|last (?:week|month)|used to|had (?:dropped|disconnected)|previously)\b/i;
  const mailIndependentSuccess = /\b(?:can|could|able to|successfully)\s+(?:read|open|access|send|receive|load)\b[^.!?;]{0,34}\b(?:mailbox|outlook|email|mail|inbox|messages?)\b[^.!?;]{0,33}\b(?:working|different|another|alternate|other)\s+(?:connection|network|link)\b|\b(?:no trouble|can|could)\b[^.!?;]{0,32}\b(?:sending|receiving|read(?:ing)?|opening)\b[^.!?;]{0,23}\b(?:messages?|mail|email|inbox|mailbox)\b[^.!?;]{0,29}\b(?:vpn|tunnel) (?:works?|stays? connected|is connected)\b/i;
  const unresolvedMail = /\b(?:stops?|stopped|cannot|can['’]t|will not|won['’]t|never|fails?|failure|unavailable|not (?:receiving|sending|working)|doesn['’]t)\b/i;

  const reportedMissingDevice = /\b(?:application|program|software|app|driver)\s+(?:says?|reports?|shows?|displays?|cannot|can['’]t|does not)\b[^.!?;]{0,55}\b(?:cannot|can['’]t|does not|not|no|missing)\b[^.!?;]{0,40}\b(?:find|detect|discover|recognize|see|scanner|reader|printer|device)\b/i;
  const sameDeviceState = /\b(?:whenever|only when|while|when)\b[^.!?;]{0,55}\b(?:that state|that screen|startup|starting|starts? up|stuck|in that condition)\b/i;
  const workingReplacement = /\b(?:can|could|able to|successfully)\s+(?:use|run|open|work with)\b[^.!?;]{0,30}\b(?:program|application|software|app|driver)\b[^.!?;]{0,32}\b(?:spare|replacement|different|other)\s+(?:scanner|reader|printer|device)\b/i;
  const dependencyTitle = /\b(?:missing|not (?:found|recognized|detected)|(?:does not|doesn['’]t|cannot|can['’]t) (?:find|detect|recognize)|no)\b/i;
  const appTerms = /\b(?:application|program|software|app|driver)\b/gi;

  function partsOf(text) {
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

  function setAside(text, background) {
    const result = prior.analyze({ subject: "Reported request", description: text });
    merge(background, [...result.matches, ...result.ignoredMatches]);
  }

  function collectStartup(parts, active) {
    let deviceAtStartup = null;
    for (const part of parts) {
      const named = softwareScanner.test(part) ? [] : terms(part, device);
      if (healthyStartup.test(part)) {
        deviceAtStartup = null;
        continue;
      }
      if (startupDisplay.test(part) && cannotPassStage.test(part)) add(active, "hardware", named);

      // Carry a single device into the immediately following observation.
      // A new service or an uncertain referent cannot inherit its status.
      if (deviceAtStartup && !named.length && !newDeviceOrService.test(part) &&
        startupReference.test(part) && (stillAtStage.test(part) || missingHome.test(part))) {
        add(active, "hardware", [deviceAtStartup]);
      }
      deviceAtStartup = named.length === 1 && !newDeviceOrService.test(part) &&
        startupDisplay.test(part) && (startupActivity.test(part) || observesStage.test(part)) ? named[0] : null;
    }
  }

  function withoutTerms(text, pattern) {
    return text.replace(pattern, "").replace(/\s+/g, " ").trim();
  }

  function filterSources(parts, background) {
    let precedingClosed = false;
    return parts.flatMap((part, index) => {
      const attachedNote = precedingClosed && noteReference.test(part) && /[“"]/.test(part) && !currentSource.test(part);
      precedingClosed = closedRecord.test(part) && !uncertainty.test(part) && !currentSource.test(part);
      if (attachedNote || precedingClosed || healthyDesktop.test(part) && !hardwareFault.test(part)) {
        setAside(part, background);
        return [];
      }
      if (guide.test(part)) {
        const tail = part.match(observedTail);
        setAside(part.slice(0, tail?.index ?? part.length), background);
        return tail ? [part.slice(tail.index + tail[0].length)] : [];
      }
      if (historicNote.test(part) && multiple.test(part)) {
        const following = parts.slice(index + 1, index + 3).join(" ");
        const topics = historicalTopics.map(([id, pattern]) => [id, terms(part, pattern)]).filter(([, found]) => found.length);
        if (topics.length > 1 && vagueRecurrence.test(following) && noReferent.test(following)) {
          topics.forEach(([id, found]) => add(background, id, found));
          return [];
        }
      }
      return [part];
    });
  }

  function filterDependentSymptoms(subject, parts, active, background) {
    const mailDependsOnLink = parts.some(part => terms(part, mail).length &&
      remote.test(part) && dependentTime.test(part) && linkFailure.test(part)) &&
      parts.some(part => mailIndependentSuccess.test(part));
    const scannerAffectsApp = active.has("hardware") &&
      parts.some(part => reportedMissingDevice.test(part) && sameDeviceState.test(part)) &&
      parts.some(part => workingReplacement.test(part));

    const kept = parts.flatMap(part => {
      if (mailDependsOnLink && terms(part, mail).length) {
        const dependentFault = remote.test(part) && dependentTime.test(part) && linkFailure.test(part);
        if (dependentFault || mailIndependentSuccess.test(part)) {
          add(background, "email", terms(part, mail));
          return dependentFault ? [withoutTerms(part, mail)] : [];
        }
      }
      if (scannerAffectsApp && (reportedMissingDevice.test(part) && sameDeviceState.test(part) || workingReplacement.test(part))) {
        add(background, "software", terms(part, appTerms));
        return [];
      }
      return [part];
    });

    // Preserve an independently failing application or mailbox. Suppress
    // only shorthand titles that describe the same verified dependence.
    let title = subject;
    if (mailDependsOnLink && (remote.test(subject) && dependentTime.test(subject) ||
      !kept.some(part => terms(part, mail).length && unresolvedMail.test(part)))) {
      title = withoutTerms(title, mail);
      add(background, "email", terms(subject, mail));
    }
    if (scannerAffectsApp && dependencyTitle.test(subject) && terms(subject, device).length) {
      title = withoutTerms(title, appTerms);
      add(background, "software", terms(subject, appTerms));
    }
    return { title, kept };
  }

  function collectObservedTunnel(parts, active, priorResult) {
    const tunnelTerms = /\b(?:vpn|(?:remote )?tunnel)\b/gi;
    // A contrast such as losing VPN on a different device can be missed by
    // prior wording rules. Keep explicit recoveries and historical quotes
    // from reactivating the network route.
    if (priorResult.ignoredMatches.some(({ id }) => id === "network") &&
      !active.has("hardware")) return;
    for (const [index, part] of parts.entries()) {
      const next = parts[index + 1] || "";
      const confirmedRecovered = tunnelRecovery.test(part) ||
        (/^(?:it|this connection|the connection|the vpn|the tunnel)\b/i.test(next) && tunnelRecovery.test(next));
      if (uncertainTunnelFault.test(part) || pastTunnel.test(part) || confirmedRecovered) continue;
      for (const fault of terms(part, observedTunnelFault)) {
        add(active, "network", terms(fault, tunnelTerms));
      }
    }
  }

  function analyze(fields) {
    const original = prior.analyze(fields);
    const active = new Map();
    const background = new Map();
    const parts = partsOf(fields.description);
    const sources = filterSources(parts, background);
    collectStartup(sources, active);
    const { title, kept } = filterDependentSymptoms(fields.subject, sources, active, background);
    const changed = title !== fields.subject || kept.length !== parts.length || kept.some((part, index) => part !== parts[index]);
    const upstream = changed ? prior.analyze({
      ...fields,
      subject: title || "Reported request",
      description: kept.join(". ") || "See the reported request."
    }) : original;
    collectObservedTunnel(kept, active, upstream);
    if (!changed && !active.size) return original;
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
  else root.TicketTriageContinuity = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
