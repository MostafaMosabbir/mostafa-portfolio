(function (root) {
  "use strict";

  const node = typeof module !== "undefined" && module.exports;
  const baseline = node ? require("./triage.js") : root.TicketTriage;
  const previous = node ? require("./routing-evidence.js") : root.TicketTriageEvidence;
  if (!baseline || !previous) return;

  const categories = baseline.categories.filter(({ id }) => id !== "other");
  // Keep quoted error text intact so punctuation in it cannot change its source.
  const sentences = /(?:[“"][^”"\r\n]*[”"]|[^.!?;\r\n“"]+|[“"])+/g;
  const endOfQuotedSentence = /([.!?][”"])(?=\s+[A-Z])/g;
  const transition = /\b(?:but|however|whereas|yet|meanwhile|separately)\b|\band\s+(?=(?:the |our |my |a |an )?(?:vpn|outlook|mailbox|calendar|wireless|internet|application|program|monitor|display|scanner|printer|keyboard|headset)\b[^.!?;“"]{0,44}\b(?:fails?|cannot|can['’]t|will not|won['’]t|stops?|drops?|disconnects?|crashes?|does not|shows? no)\b)/i;
  const device = /\b(?:(?:barcode|bar code|label|badge|card|ticket) reader|(?:barcode|bar code|label|document|handheld|flatbed|usb) scanner|scanner|printer|projector|kiosk|handheld terminal|docking station|laptop|notebook|thin client)\b/gi;
  const scannerSoftware = /\b(?:security|vulnerability|virus|port|network|malware|software) scanner\b/i;
  const startupStage = /\b(?:maker[’']s name|manufacturer[’']s (?:name|logo)|brand(?: name| logo)?|logo|splash (?:screen|page)|boot (?:screen|page)|home (?:screen|menu|view)|startup (?:screen|page)|main menu)\b/i;
  const stalled = /\b(?:stuck|hangs?|freezes?|sits? on|stays? (?:at|on)|remains? (?:at|on)|stops? (?:at|before)|never (?:gets? (?:to|past|beyond)|makes? it (?:to|past|beyond)|advances?|progresses?|reaches?|shows?|opens?|loads?|moves?)|(?:cannot|can['’]t|won['’]t|will not|does not|doesn['’]t) (?:get (?:to|past|beyond)|reach|load|advance|progress|open|move past))\b/i;
  const noMenu = /\b(?:never|cannot|can['’]t|will not|won['’]t|does not|doesn['’]t)\s+(?:reach(?:es)?|show(?:s)?|open(?:s)?|load(?:s)?|display(?:s)?|get to)\b[^.!?;]{0,36}\b(?:menu|home (?:view|screen|page))\b/i;
  const recovered = /\b(?:no longer (?:stuck|hangs?|frozen)|not stuck|never got stuck|now (?:reaches?|loads?|shows?)|works? normally|may be stuck|might be stuck)\b/i;
  const wiredFault = /\b(?:no (?:wired|ethernet|network) (?:connection|link|signal)|(?:wired|ethernet|network) link (?:stays? down|is down|never (?:comes? up|establishes))|(?:fails?|failed) to establish (?:a )?(?:wired|ethernet|network) (?:connection|link))\b/gi;
  const application = /\b(?:application|program|editor|installer|spreadsheet)\b/gi;
  const applicationExit = /\b(?:exits?|quits?|closes?|crash(?:es)?|shuts? down)\b[^.!?;]{0,24}\b(?:whenever|each time|every time|during|while|when|on)\b[^.!?;]{0,38}\b(?:sav(?:e|es|ing)|export(?:s|ing)?|import(?:s|ing)?|generat(?:e|es|ing)|creat(?:e|es|ing)|print(?:s|ing)?|submit(?:s|ting)?|open(?:s|ing)?|edit(?:s|ing)?)\b/i;
  const advice = /^(?:the |a |our )?(?:help (?:page|article|guide)|guide|manual|runbook|support (?:page|article)|instructions) (?:tells? (?:me|us|users) to|advises?|recommends?|says? to|suggests?)\b/i;
  const observationTail = /,?\s+and\s+(?=(?:i|we)\s+(?:saw|heard|observed|found|confirmed|tested|checked|noticed)\b)/i;
  const workingPicture = /\b(?:picture|screen|display) (?:stays? (?:steady|visible|clear)|works? (?:fine|normally)|looks? (?:fine|normal))\b/i;
  const display = /\b(?:monitor|display|picture|screen|projector)\b/gi;
  const displayedFault = /\b(?:goes? (?:dark|black|blank)|flicker\w*|flashes|no (?:picture|signal|image)|(?:is|stays?) (?:blank|black|dark)|loses? (?:signal|picture))\b/i;
  const replaced = /\b(?:(?:the |my |our )?(?:old|previous|faulty|failed) [^.!?;]{1,35}?(?:was|has been) (?:replaced|swapped(?: out)?|retired)|(?:was|has been) (?:replaced|swapped(?: out)?)\b[^.!?;]{0,50}\b(?:new|replacement) (?:one|unit|device|monitor|screen)\s+(?:looks? (?:fine|normal)|works? (?:fine|normally)))\b/i;
  const closedIncident = /\b(?:(?:closed|resolved|completed)\s+(?:[\w’']+\s+){0,4}(?:incident|case|ticket|outage|report)|(?:incident|case|ticket|outage|problem report)\b[^.!?;“"]{0,40}\b(?:is|was|had been|had already been|has been|has already been)\s+(?:already\s+)?(?:closed|resolved|completed))\b/i;
  const unconfirmedClosure = /\b(?:not|never|cannot|can['’]t|won['’]t|will not|may|might|should|if|whether) (?:yet |be |have |have been )?(?:close|closed|resolve|resolved|complete|completed)\b/i;
  const oldNote = /^(?:the |an? |that )?(?:old|previous|earlier|closed|resolved) (?:support )?(?:note|record|log|entry|report)\b/i;
  const currently = /\b(?:current(?:ly)?|right now|appears? now|happening now|still happens|new issue)\b/i;
  const quote = /[“"][^”"\r\n]+[”"]/;
  const historicalList = /\b(?:note|record|report|log|ticket|case)\b[^.!?;]{0,35}\b(?:listed|mentioned|described|had|included|noted)\b/i;
  const namedProgram = /\b(?:installer|installation|application|software|program|editor)\b/gi;
  const namedEquipment = /\b(?:printer|monitor|keyboard|scanner|headset|mouse|camera)\b/gi;
  const unnamedFailure = /^(?:it|one of them|that problem)\b[^.!?;]{0,50}\b(?:failed|stopped|broke|crashed|hung|froze|returned)\b/i;
  const unknownReference = /\b(?:do not know|don['’]t know|not sure|unable to tell|cannot tell|can['’]t tell|unsure)\s+which\b/i;

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
    const result = previous.analyze({ subject: "Reported request", description: text });
    merge(background, [...result.matches, ...result.ignoredMatches]);
  }

  function descriptionParts(description) {
    const lines = description.replace(endOfQuotedSentence, "$1\n").match(sentences) || [];
    return lines.flatMap(line => {
      const parts = [""];
      // A contrast inside a quoted message is part of the message.
      for (const fragment of line.split(/([“"][^”"]*[”"])/)) {
        if (quote.test(fragment)) {
          parts[parts.length - 1] += fragment;
        } else {
          const segments = fragment.split(transition);
          parts[parts.length - 1] += segments[0];
          parts.push(...segments.slice(1));
        }
      }
      return parts.map(text => text.trim()).filter(Boolean);
    });
  }

  function filterDescription(description, background) {
    const parts = descriptionParts(description);
    const kept = [];
    let previousClosed = false;
    for (const [index, part] of parts.entries()) {
      const closedRecord = closedIncident.test(part) && !unconfirmedClosure.test(part) && !currently.test(part);
      const priorQuote = previousClosed && oldNote.test(part) && quote.test(part) && !currently.test(part);
      previousClosed = closedRecord;
      if (closedRecord || priorQuote) {
        setAside(part, background);
        continue;
      }
      if (advice.test(part)) {
        const tail = part.match(observationTail);
        const guidance = part.slice(0, tail?.index ?? part.length);
        setAside(guidance, background);
        add(background, "hardware", terms(guidance, display));
        if (tail) kept.push(part.slice(tail.index + tail[0].length));
        continue;
      }
      if ((workingPicture.test(part) || replaced.test(part)) && !displayedFault.test(part) && !applicationExit.test(part)) {
        setAside(part, background);
        add(background, "hardware", terms(part, display));
        continue;
      }
      const mentions = terms(part, namedProgram);
      const equipment = terms(part, namedEquipment);
      const recurrence = parts[index + 1] || "";
      const clarification = parts[index + 2] || "";
      if (historicalList.test(part) && mentions.length && equipment.length &&
        unnamedFailure.test(recurrence) && unknownReference.test(recurrence + " " + clarification)) {
        // The prior note names two faults, but the reporter cannot identify
        // which one came back. Leave both for review instead of guessing.
        setAside(part, background);
        add(background, "software", mentions);
        add(background, "hardware", equipment);
        continue;
      }
      kept.push(part);
    }
    return { changed: kept.length !== parts.length || kept.some((part, index) => part !== parts[index]), kept };
  }

  function collect(parts, active) {
    for (const part of parts) {
      if (!recovered.test(part) && !scannerSoftware.test(part) && (startupStage.test(part) && stalled.test(part) || noMenu.test(part))) {
        add(active, "hardware", terms(part, device));
      }
      add(active, "network", terms(part, wiredFault));
      if (applicationExit.test(part)) add(active, "software", terms(part, application));
    }
  }

  function analyze(fields) {
    const original = previous.analyze(fields);
    const active = new Map();
    const background = new Map();
    const { changed, kept } = filterDescription(fields.description, background);
    collect([fields.subject, ...kept, typeof fields.error === "string" ? fields.error : ""], active);
    if (!changed && !active.size) return original;

    const upstream = changed ? previous.analyze({
      ...fields, description: kept.join(". ") || "See the reported request."
    }) : original;
    merge(active, upstream.matches);
    merge(background, upstream.ignoredMatches);

    const matches = categories.flatMap(({ id, label }) => active.has(id)
      ? [{ id, label, terms: [...active.get(id)] }] : []);
    const ignoredMatches = categories.flatMap(({ id, label }) => {
      const ignored = [...(background.get(id) ?? [])].filter(term => !active.get(id)?.has(term));
      return ignored.length ? [{ id, label, terms: ignored }] : [];
    });
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
  else root.TicketTriageBoot = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
