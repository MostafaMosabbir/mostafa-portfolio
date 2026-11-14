(function (root) {
  "use strict";

  const node = typeof module !== "undefined" && module.exports;
  const baseline = node ? require("./triage.js") : root.TicketTriage;
  const prior = node ? require("./routing-symptoms.js") : root.TicketTriageSymptoms;
  if (!baseline || !prior) return;

  const categories = baseline.categories.filter(({ id }) => id !== "other");
  const advice = /^(?:(?:some(?:one|body)|support|a colleague|a technician|the team|the guide|the manual|the checklist|the runbook)\s+(?:said|says|suggested|advised|recommended)\s+(?:to\s+)?)(?:check(?:ing)?|test(?:ing)?|try(?:ing)?|restart(?:ing)?|reset(?:ting)?|inspect(?:ing)?|if|when)\b/i;
  const observationTail = /,?\s+and\s+(?=(?:i|we)\s+(?:saw|heard|observed|found|confirmed|tested|checked|noticed)\b)/i;
  const confirmedRemoteUse = /\b(?:can|could|able to|successfully)\s+(?:successfully\s+)?(?:connect to|use|open)\s+(?:the\s+|our\s+|my\s+)?(?:vpn|remote tunnel)\b[^.!?;]{0,80}\b(?:normally|successfully|without (?:any )?(?:errors|problems))\b/i;
  const healthyDisplay = /\b(?:picture|display|screen|desktop)\s+(?:stays? visible|shows? (?:every other|all other) [^.!?;]{0,35}\bclearly|works? (?:normally|fine)|is (?:fine|clear))\b/i;
  const uncertain = /\b(?:may|might|perhaps|whether|supposedly|should)\b/i;
  const negatedFailure = /\b(?:not stuck|no longer (?:stuck|black|failing|unresponsive|jammed)|no (?:startup|display|scan) (?:issue|problem)|never got stuck|now works)\b/i;

  const guideTerms = [/\b(?:desktop|monitor|screen|display|scanner|printer)\b/gi, /\b(?:network|vpn|wireless|router)\b/gi];
  const scanner = /\b(?:(?:barcode|bar code|label|document|flatbed|handheld|usb) )?(?:scanner|(?:barcode|bar code|label) reader)\b/gi;
  const startupDevice = /\b(?:printer|laptop|notebook|desktop computer|projector|(?:usb )?camera|webcam|docking station)\b/gi;
  const scannerIsSoftware = /\b(?:security|virus|port|network|malware|vulnerability|software) scanner\b/i;
  const startupStage = "(?:logo|splash\\s+(?:screen|page)|startup|initialization|boot(?: screen)?)";
  const startupFailure = new RegExp(
    "\\b(?:never|cannot|can['’]t|won['’]t|will not|fails? to|does(?: not|n['’]t))\\s+" +
    "(?:gets?|go(?:es)?|moves?|advances?|makes? it)\\s+(?:any further than|past|beyond|through)\\b[^.!?;]{0,65}\\b" +
    startupStage + "\\b|\\b(?:stuck|hangs?|freez\\w*|frozen)\\b[^.!?;]{0,40}\\b" + startupStage + "\\b", "i");
  const outputFailure = /\b(?:nothing (?:appears?|shows?|comes? out)|no (?:image|output|scan|result) (?:appears?|shows?|comes? out|is (?:shown|produced|captured)|at all)|(?:never|will not|won['’]t) (?:produces?|returns?|captures?|feeds?)\b)\b/i;
  const dock = /\b(?:dock|docking station)\b/gi;
  const chargeBypass = /\b(?:only (?:charges?|receives? power) (?:if|when)|(?:does not|doesn['’]t|cannot|can['’]t|will not|won['’]t) charge (?:unless|until))\b[^.!?;]{0,85}\b(?:bypass|skip|unplug|remove|disconnect)(?:s|ed|ing)?\b/i;
  const display = /\b(?:monitor|external display|projector)\b/gi;
  const displayFailure = /\b(?:is|stays?|goes?|remains?) (?:completely )?(?:black|dark|blank)|\b(?:no picture|no signal|no visible image)\b/i;
  const camera = /\b(?:webcam|(?:usb )?camera)\b/gi;
  const repair = /\b(?:(?:had |has |have |we |i )*(?:restored|repaired|fixed|recovered)\b|worked again\b)/i;
  const jointRepair = /\b(?:and|both)\b/i;
  const cameraRecurs = /\b(?:vanished|disappeared|went missing|stopped (?:appearing|showing)|is missing|is gone)\b[^.!?;]{0,35}\bagain\b/i;
  const otherDevice = /\b(?:vpn|wireless|network|monitor|printer|mouse|keyboard|headset|scanner|application|mailbox)\b/i;

  const wiredPoint = /\b(?:(?:wall|ethernet|data|network|wired) (?:jack|socket|outlet|port|link)s?|link light)\b/gi;
  const noLink = /\b(?:no (?:ethernet |wired |network )?(?:signal|link|internet|connection)|(?:does not|doesn['’]t|cannot|can['’]t|won['’]t|will not) (?:get|show|establish|go) (?:a (?:wired |ethernet )?)?(?:link|online|internet)|neither(?:\s+(?:computers?|devices?|machine|one))?\s+(?:gets?|shows?|goes?) (?:a (?:wired |ethernet )?)?(?:link|online|internet)|link light (?:stays?|is|remains?) (?:off|dark|unlit))\b/i;
  const identity = /\b(?:account (?:has |have |had |is |was |remains? )*(?:been )?(?:temporarily )?disabled|(?:multifactor|multi[ -]factor|two[ -]factor|identity) (?:verification|authentication) (?:was |is |has been )?(?:rejected|denied|timed out|failed)|(?:approv(?:al|ing) (?:request|prompt)|verification (?:request|prompt)) (?:was |is |has )?(?:timed out|expired|rejected|denied))\b/gi;
  const program = /\b(?:(?:scheduling|accounting|payroll|inventory|design|reporting) )?(?:program|application|app|installer|setup)\b/gi;
  const appExit = /\b(?:exits?|quits?|closes?|shuts? down|terminates?)\b[^.!?;]{0,60}\b(?:whenever|every time|on|during|when|after|while)\b[^.!?;]{0,55}\b(?:save|export|import|report|spreadsheet|open|load|operation)\b/i;
  const installLoop = /\b(?:rolls? back|returns? to (?:its |the |a )?(?:welcome|opening|first|starting) (?:page|screen|step)|(?:never|does not|doesn['’]t|cannot|can['’]t) (?:complete|finish) (?:the )?(?:installation|setup))\b/i;

  function clauses(text) {
    return text.split(/[.!?;\n]+|\b(?:but|however|whereas|yet|separately)\b/i)
      .map(part => part.trim().replace(/^,\s*/, "")).filter(Boolean);
  }

  function terms(text, pattern) {
    return [...text.matchAll(pattern)].map(([term]) => term.toLowerCase());
  }

  function add(ledger, id, matches) {
    if (!matches.length) return;
    if (!ledger.has(id)) ledger.set(id, new Set());
    for (const term of matches) ledger.get(id).add(term);
  }

  function merge(ledger, matches) {
    for (const { id, terms: matchesForCategory } of matches) add(ledger, id, matchesForCategory);
  }

  // A confirmed success and an attributed suggestion are not reports of
  // active faults. Keep separately stated observations in the same sentence.
  function removeBackground(parts, background) {
    return parts.flatMap(part => {
      if (advice.test(part)) {
        const tail = part.match(observationTail);
        const guidance = part.slice(0, tail?.index ?? part.length);
        add(background, "hardware", terms(guidance, guideTerms[0]));
        add(background, "network", terms(guidance, guideTerms[1]));
        return tail ? [part.slice(tail.index + tail[0].length)] : [];
      }
      if (confirmedRemoteUse.test(part) && !/\b(?:disconnect\w*|drops?|fails?|errors?)\b/i.test(part.replace(/without (?:any )?(?:errors|problems)/i, ""))) {
        add(background, "network", terms(part, /\b(?:vpn|remote tunnel)\b/gi));
        return [];
      }
      if (healthyDisplay.test(part) && !displayFailure.test(part) && !appExit.test(part)) {
        add(background, "hardware", terms(part, /\b(?:desktop|monitor|screen|display)\b/gi));
        return [];
      }
      return [part];
    });
  }

  function unclearCameraRecovery(parts, background) {
    return parts.filter((part, index) => {
      const next = parts[index + 1];
      if (!next || !/^(?:it|the device)\b/i.test(next) || !cameraRecurs.test(next) ||
        !repair.test(part) || !jointRepair.test(part) || !otherDevice.test(part)) return true;
      const cameras = terms(part, camera);
      if (!cameras.length) return true;

      // Both devices were reported repaired and the pronoun names neither.
      // Keep the prior device names as background rather than selecting either.
      const priorEvidence = prior.analyze({ subject: "Reported request", description: part });
      add(background, "hardware", cameras);
      merge(background, [...priorEvidence.matches, ...priorEvidence.ignoredMatches]);
      return false;
    });
  }

  function collect(parts, active) {
    let preceding = "";
    for (const part of parts) {
      if (!uncertain.test(part) && !negatedFailure.test(part)) {
        const scannerTerms = scannerIsSoftware.test(part) ? [] : terms(part, scanner);
        if (startupFailure.test(part)) {
          add(active, "hardware", [...scannerTerms, ...terms(part, startupDevice)]);
        }
        if (!scannerIsSoftware.test(part)) {
          if (outputFailure.test(part)) add(active, "hardware", scannerTerms);
          if (!scannerTerms.length && /\b(?:it|its)\b/i.test(part) && outputFailure.test(part) && !scannerIsSoftware.test(preceding)) {
            add(active, "hardware", terms(preceding, scanner));
          }
        }
        if (chargeBypass.test(part)) add(active, "hardware", terms(part, dock));
        if (displayFailure.test(part)) add(active, "hardware", terms(part, display));
        if (/^(?:it|the device)\b/i.test(part) && cameraRecurs.test(part) && repair.test(preceding) && !otherDevice.test(preceding)) {
          add(active, "hardware", terms(preceding, camera));
        }
        if (noLink.test(part)) {
          add(active, "network", terms(part, wiredPoint));
          if (!terms(part, wiredPoint).length && /^neither\b/i.test(part)) add(active, "network", terms(preceding, wiredPoint));
        }
        if (!/\b(?:no longer|not disabled|had been disabled before)\b/i.test(part)) add(active, "access", terms(part, identity));
        if (appExit.test(part) || installLoop.test(part) && /\b(?:install(?:er|ing|ation)?|setup)\b/i.test(part)) {
          add(active, "software", terms(part, program));
        }
      }
      preceding = part;
    }
  }

  function analyze(fields) {
    const original = prior.analyze(fields);
    const active = new Map();
    const background = new Map();
    const description = clauses(fields.description);
    const filtered = unclearCameraRecovery(removeBackground(description, background), background);
    collect(clauses(fields.subject), active);
    collect(filtered, active);
    collect(clauses(typeof fields.error === "string" ? fields.error : ""), active);

    const changed = filtered.length !== description.length || filtered.some((part, index) => part !== description[index]);
    if (!active.size && !changed) return original;
    const updated = !changed ? original :
      prior.analyze({ ...fields, description: filtered.join(". ") || "See the reported request." });
    merge(active, updated.matches);
    merge(background, updated.ignoredMatches);

    const matches = categories.flatMap(({ id, label }) => active.has(id)
      ? [{ id, label, terms: [...active.get(id)] }] : []);
    const ignoredMatches = categories.flatMap(({ id, label }) => {
      const ignoredTerms = [...(background.get(id) ?? [])].filter(term => !active.get(id)?.has(term));
      return ignoredTerms.length ? [{ id, label, terms: ignoredTerms }] : [];
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
  else root.TicketTriageEvidence = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
