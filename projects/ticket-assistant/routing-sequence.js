(function (root) {
  "use strict";

  const node = typeof module !== "undefined" && module.exports;
  const baseline = node ? require("./triage.js") : root.TicketTriage;
  const prior = node ? require("./routing-continuity.js") : root.TicketTriageContinuity;
  if (!baseline || !prior) return;

  const categories = baseline.categories.filter(({ id }) => id !== "other");
  const sentence = /(?:[“"][^”"\r\n]*[”"]|[^.!?;\r\n“"]+|[“"])+/g;
  const quotedEnd = /([.!?][”"])(?=\s+[A-Z])/g;
  const device = /\b(?:(?:handheld |usb )?(?:inventory |barcode |bar code |label |badge |card |ticket )?reader|(?:barcode |bar code |label |document |handheld |flatbed |usb )?scanner|(?:receipt |label |training )?printer|handheld terminal|(?:usb |built in )?webcam|(?:usb )?camera|projector|kiosk|docking station)\b/gi;
  const softwareDevice = /\b(?:vulnerability|virus|malware|network|port|software|security) scanner|\b(?:pdf|document|screen|ebook|browser) reader\b/i;
  const subjectsInHistory = [
    ["access", /\b(?:login|log in|sign in|password|mfa|authentication)\b/gi],
    ["hardware", /\b(?:[\w ]{0,16}(?:printer|reader|scanner)|monitor|display|keyboard|camera|webcam)\b/gi],
    ["network", /\b(?:vpn|wireless|network|internet|ethernet)\b/gi],
    ["email", /\b(?:outlook|email|mailbox|calendar)\b/gi],
    ["software", /\b(?:software|application|program|app|installer)\b/gi]
  ];
  const boot = /\b(?:at (?:startup|boot|power on)|power(?:s|ed|ing)? (?:up|on)|turn(?:s|ed|ing)? on|switch(?:es|ed|ing)? on|start(?:s|ed|ing)? up|initializ\w*)\b/i;
  const openingStage = /\b(?:wordmark|maker(?:'s|’s)? (?:logo|name)|company emblem|manufacturer(?:'s|’s)? (?:logo|name)|logo|splash (?:screen|page)|opening (?:picture|image|screen|page)|start(?:up|ing) (?:picture|image|screen|page)|boot (?:screen|page))\b/i;
  const progressMissing = /\b(?:menu|home (?:view|page|screen)|ready (?:symbol|light|indicator))\b[^.!?;]{0,36}\b(?:never (?:appears?|shows?|loads?|comes? up)|does not (?:appear|show|load)|will not (?:appear|show|load))\b|\b(?:never|does not|doesn['’]t|cannot|can['’]t)\s+(?:shows?|displays?|reaches?|loads?|opens?|get to)\b[^.!?;]{0,44}\b(?:menu|home (?:screen|view|page)|ready (?:symbol|light|indicator))\b/i;
  const persistence = /\b(?:stays? (?:there|at|on)|sits? (?:there|at|on)|remains? (?:there|at|on)|keeps? showing|never changes?|(?:is|gets?) stuck|freez\w*|no change|makes? no difference)\b/i;
  const component = /^(?:(?:it|the device|that device|this device)\b|(?:(?:the|its)\s+)?(?:main |home |startup |front panel )?(?:display|screen|menu|home view|status light|buttons?|ready (?:light|symbol))\b)/i;
  const localTest = /\b(?:press(?:ed|ing)? the test button|only (?:to )?power|standalone test|with (?:the |its )?(?:data cable|computer) (?:off|disconnected)|data cable (?:is |was )?removed)\b/i;
  const noLongerStuck = /\b(?:no longer (?:stays?|remains?|freezes?|hangs?|shows?|stuck)|not stuck|now (?:shows?|loads?|displays?|opens?|reaches?)|opens? normally|may be stuck|might be stuck)\b/i;
  const topicBoundary = /^\s*(?:separately|meanwhile|on another computer|in (?:another|the next) (?:room|department)|another (?:device|computer|worker|problem)|a different (?:problem|test|computer))\b|\b(?:vpn|wireless|ethernet|mailbox|outlook|application|portal)\b/i;
  const camera = /\b(?:webcam|camera)\b/gi;
  const localCameraFault = /\b(?:preview|local (?:camera|video) (?:test|view)|viewfinder)\b[^.!?;]{0,32}\b(?:stays?|is|remains?|goes?) (?:black|blank|dark)|\b(?:black|blank|dark) (?:camera |video )?preview\b/i;

  const historicalNote = /\b(?:previous|earlier|old|prior|closed|resolved|yesterday['’]s|last week['’]s)\b[^.!?;“"]{0,38}\b(?:note|ticket|incident|report|record|request)\b/i;
  const historicalClosure = /\b(?:closed|resolved|completed)\b/i;
  const closedSupportItem = /\b(?:ticket|case|incident|request|report)\b[^.!?;]{0,30}\b(?:is|was|had been|has been) (?:already )?(?:closed|resolved|completed)\b/i;
  const noteOfPreviousItem = /^(?:its|that (?:ticket|case|incident|request|report)['’]s) (?:note|record|report|entry)\b/i;
  const statusUncertain = /\b(?:may|might|possibly|should be|not yet|was not|is not)\b/i;
  const recurrence = /\b(?:it|that|this|the same thing)\s+(?:failed|stopped|broke|quit|happened|went wrong|returned) again\b/i;
  const unclear = /\b(?:do not know|don['’]t know|cannot say|cannot tell|can['’]t tell|not sure|no idea|unsure)\b[^.!?;]{0,48}\b(?:which|what|whether)\b/i;
  const current = /\b(?:currently|right now|today\b[^.!?;]{0,17}\b(?:shows?|says?)|now (?:shows?|displays?|says?))\b/i;
  const mixedSource = /\b(?:but|however|whereas|yet|and today|and now)\b/i;
  const fixedEquipment = /\b(?:replaced|swapped out|retired|removed|repaired) (?:the |our |my )?(?:broken|old|faulty|failed|previous) (?:desktop|computer|monitor|screen|laptop|scanner|printer|device)\b/i;
  const closedRequest = /\b(?:closed|resolved|completed) (?:that|the|its|this) (?:request|ticket|case|incident)\b/i;

  const app = /\b(?:application|program|editor|app|utility)\b/gi;
  const appFault = /\b(?:freez\w*|hangs?|locks up|vanish\w*|closes?|crash\w*|exits?|shuts? down|quits?)\b/i;
  const scopedAppFault = /\b(?:when|while|whenever|each time|every time|during|on)\b[^.!?;]{0,48}\b(?:export\w*|print\w*|import\w*|edit\w*|sav\w*|paste\w*|scrub\w*|preview\w*|render\w*|load\w*|assembl\w*|open\w*)\b/i;
  const healthyDisplay = /\b(?:display|screen|monitor)\b[^.!?;]{0,45}\b(?:keep(?:s)? showing|shows?|stays? (?:visible|clear|normal)|remains? (?:visible|clear|normal)|works? (?:fine|normally))\b/i;
  const displayFault = /\b(?:flicker\w*|goes? (?:black|dark|blank)|no (?:picture|signal|image)|loses? (?:its )?picture|(?:is|stays?) (?:black|blank|dark))\b/i;
  const displayTerms = /\b(?:display|monitor|desktop|laptop screen|screen)\b/gi;
  const alternateDisplay = /^(?:it|the (?:same )?(?:app|program|application))\b[^.!?;]{0,50}\b(?:if|when|with|on)\b[^.!?;]{0,40}\b(?:laptop screen|display|monitor)\b/i;
  const unrelatedMailTest = /,?\s*\b(?:even )?after (?:i|we) clos(?:e|ed|ing) (?:outlook|the (?:mailbox|inbox|email app))\b/i;
  const missingDeviceMessage = /\b(?:app|application|program|driver|software)\b[^.!?;]{0,65}\b(?:no (?:scanner|reader|printer|device) detected|(?:cannot|can['’]t|does not|doesn['’]t) (?:see|find|detect|recognize) (?:a |the |our |this )?(?:scanner|reader|printer|device)|(?:scanner|reader|printer|device) not (?:found|seen|detected))\b/i;
  const followsDeviceFault = /\b(?:whenever|when|while|each time|every time)\b[^.!?;]{0,45}\b(?:this happens|it happens|that happens|(?:it is |it gets )?stuck|in that state|on that screen)\b/i;
  const seesReplacement = /\b(?:app|application|program|driver|software)\b[^.!?;]{0,60}\b(?:sees?|detects?|recognizes?|works? with)\b[^.!?;]{0,32}\b(?:spare|other|different|replacement) (?:reader|scanner|printer|device)\b/i;
  const kicksOut = /\b(?:kicked out of|thrown out of|disconnected from) (?:the |my |our |their )?(?:vpn|remote tunnel)\b/gi;
  const notObserved = /\b(?:never|not|no longer|might|may|if|whether)\b/i;

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
    for (const [id, pattern] of subjectsInHistory) add(background, id, terms(text, pattern));
  }

  function filterHistorical(parts, background) {
    let precedingClosed = false;
    return parts.flatMap((part, index) => {
      const quoteFromClosed = historicalNote.test(part) && historicalClosure.test(part) && /[“"]/.test(part);
      const closedEquipment = fixedEquipment.test(part) && closedRequest.test(part);
      const attachedNote = precedingClosed && noteOfPreviousItem.test(part) && /[“"]/.test(part);
      precedingClosed = closedSupportItem.test(part) && !statusUncertain.test(part);
      if ((quoteFromClosed || closedEquipment || attachedNote) && !statusUncertain.test(part) &&
        !current.test(part) && !mixedSource.test(part)) {
        setAside(part, background);
        return [];
      }
      if (historicalNote.test(part)) {
        const mentioned = terms(part, device);
        const remaining = parts.slice(index + 1, index + 3).join(" ");
        if (new Set(mentioned).size > 1 && recurrence.test(remaining) && unclear.test(remaining)) {
          setAside(part, background);
          add(background, "hardware", mentioned);
          return [];
        }
      }
      const appObservation = terms(part, app).length && appFault.test(part) && scopedAppFault.test(part);
      if (appObservation && unrelatedMailTest.test(part)) {
        add(background, "email", terms(part, /\b(?:outlook|mailbox|inbox|email)\b/gi));
        return [part.replace(unrelatedMailTest, "")];
      }
      return [part];
    });
  }

  function deviceFaults(parts, active) {
    let episode = null;
    for (const part of parts) {
      const named = softwareDevice.test(part) ? [] : [...new Set(terms(part, device))];
      if (!topicBoundary.test(part) && !notObserved.test(part) && localCameraFault.test(part)) {
        add(active, "hardware", terms(part, camera));
      }
      if (topicBoundary.test(part) || noLongerStuck.test(part) || named.length > 1) {
        episode = null;
        continue;
      }
      const opened = openingStage.test(part);
      const stalled = progressMissing.test(part) || persistence.test(part);
      if (named.length === 1 && (boot.test(part) || opened)) {
        episode = { name: named[0], boot: boot.test(part), opened, stalled };
      } else if (episode && (component.test(part) || localTest.test(part))) {
        // A definite component belongs to the device only within its local
        // startup episode. The two observations can arrive in either order.
        episode.opened ||= opened;
        episode.stalled ||= stalled;
      } else {
        episode = null;
      }
      if (episode?.stalled && (episode.opened || episode.boot)) add(active, "hardware", [episode.name]);
    }
  }

  function filterDependence(subject, parts, active, background) {
    const appObserved = parts.some(part => terms(part, app).length && appFault.test(part) && scopedAppFault.test(part));
    const dependentDevice = active.has("hardware") &&
      parts.some(part => missingDeviceMessage.test(part) && followsDeviceFault.test(part)) &&
      parts.some(part => seesReplacement.test(part));
    const kept = parts.flatMap(part => {
      const workingDisplay = healthyDisplay.test(part) && !displayFault.test(part);
      const onlyAlternativeDisplay = alternateDisplay.test(part) && !displayFault.test(part);
      if (appObserved && (workingDisplay || onlyAlternativeDisplay)) {
        add(background, "hardware", terms(part, displayTerms));
        return [];
      }
      if (dependentDevice && (missingDeviceMessage.test(part) && followsDeviceFault.test(part) || seesReplacement.test(part))) {
        add(background, "software", terms(part, app));
        return [];
      }
      return [part];
    });
    if (dependentDevice && missingDeviceMessage.test(subject)) {
      add(background, "software", terms(subject, app));
      return { subject: subject.replace(app, "").replace(/\s+/g, " ").trim(), kept };
    }
    return { subject, kept };
  }

  function analyze(fields) {
    const original = prior.analyze(fields);
    const active = new Map();
    const background = new Map();
    const description = partsOf(fields.description);
    const observations = filterHistorical(description, background);
    deviceFaults(observations, active);
    const { subject, kept } = filterDependence(fields.subject, observations, active, background);
    for (const part of kept) {
      if (appFault.test(part) && scopedAppFault.test(part)) add(active, "software", terms(part, app));
      if (!notObserved.test(part)) {
        for (const match of terms(part, kicksOut)) add(active, "network", terms(match, /\b(?:vpn|remote tunnel)\b/gi));
      }
    }
    const changed = subject !== fields.subject || kept.length !== description.length ||
      kept.some((part, index) => part !== description[index]);
    if (!changed && !active.size) return original;
    const updated = changed ? prior.analyze({
      ...fields, subject: subject || "Reported request", description: kept.join(". ") || "See the reported request."
    }) : original;
    merge(active, updated.matches);
    merge(background, updated.ignoredMatches);
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
  else root.TicketTriageSequence = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
