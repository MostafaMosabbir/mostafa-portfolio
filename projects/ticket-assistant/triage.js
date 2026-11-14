(function (root) {
  "use strict";

  // This engine reads the fictional request passed by the interface. It does
  // not read browser state, store tickets, or contact a service.
  const rules = [
    { id: "network", label: "Network and connectivity", pattern: /\b(vpn|wi[ -]?fi|internet|network|connection drops?)\b/gi },
    { id: "email", label: "Email and calendar", pattern: /\b(outlook|e[ -]?mail|mailbox|calendar|meeting invit(?:e|ation))\b/gi },
    { id: "access", label: "Account access", pattern: /\b(sign[ -]?in|log[ -]?in|password|locked out|account locked|mfa|authentication)\b/gi },
    { id: "hardware", label: "Devices and hardware", pattern: /\b(laptop|desktop|monitor|printer|keyboard|mouse|headset|no power|battery)\b/gi },
    { id: "software", label: "Software and applications", pattern: /\b(app(?:lication)? crash(?:es|ed)?|software|installation|install error)\b/gi }
  ];
  const categories = Object.freeze([
    ...rules.map(({ id, label }) => Object.freeze({ id, label })),
    Object.freeze({ id: "other", label: "Other or needs more detail" })
  ]);

  const factFields = [
    { field: "scope", label: "Impact", question: "Who is affected, and what work is blocked?" },
    { field: "onset", label: "When it started", question: "When did this first occur?" },
    { field: "error", label: "Observed error", question: "What exact error appears, if any?" },
    { field: "workaround", label: "Workaround", question: "Is there a workaround or anything you already tried?" }
  ];

  const scopeQuestions = {
    network: "Does the connection problem affect other people, devices, or applications?",
    email: "Does this affect sending, receiving, the calendar, or more than one of those?",
    access: "Which application is affected, and can anyone else access it?",
    hardware: "Who is affected, and can they continue the same task on another device?",
    software: "Which application is affected, and does the same action fail for others?"
  };

  const samples = Object.freeze([
    {
      id: "vpn", title: "VPN disconnects",
      fields: {
        subject: "VPN disconnects after a few minutes",
        description: "I can connect to the VPN, but it drops a few minutes later. It started this morning.",
        onset: "This morning"
      },
      expected: { status: "suggested", category: "network" }
    },
    {
      id: "mixed", title: "Outlook and VPN",
      fields: {
        subject: "Outlook stops syncing when the VPN drops",
        description: "My Outlook inbox stops updating whenever the VPN disconnects. It updates again when the VPN reconnects.",
        workaround: "Reconnect the VPN to resume inbox sync."
      },
      expected: { status: "ambiguous", category: null }
    },
    {
      id: "unknown", title: "Request needs detail",
      fields: {
        subject: "Something keeps going wrong",
        description: "It happened again today and I had to stop working on it.",
        scope: "One requester had to stop their task."
      },
      expected: { status: "unrecognized", category: null }
    },
    {
      id: "calendar", title: "Calendar invites fail",
      fields: {
        subject: "Calendar invites will not send",
        description: "New calendar invites stay pending. Existing appointments still appear.",
        scope: "One person cannot send invitations.",
        error: "The invitation could not be sent."
      },
      expected: { status: "suggested", category: "email" }
    },
    {
      id: "printer", title: "Printer stops responding",
      fields: {
        subject: "Printer stalls before printing",
        description: "Jobs for the printer on the second floor remain queued.",
        scope: "Two desks need to print forms.",
        onset: "After the morning break",
        error: "No error was shown.",
        workaround: "One desk can print upstairs."
      },
      expected: { status: "suggested", category: "hardware" }
    },
    {
      id: "account", title: "Account locked",
      fields: {
        subject: "Account locked during login",
        description: "I received a locked out message while signing into the training portal.",
        scope: "One user cannot access the training portal.",
        error: "Account locked."
      },
      expected: { status: "suggested", category: "access" }
    },
    {
      id: "software", title: "Application crashes",
      fields: {
        subject: "App crashes on export",
        description: "The inventory app crashed twice when I tried to export the weekly list.",
        onset: "After lunch",
        workaround: "The on screen report still opens."
      },
      expected: { status: "suggested", category: "software" }
    },
    {
      id: "incidental", title: "Email works, VPN fails",
      fields: {
        subject: "Email works but VPN fails",
        description: "Email works from home. The VPN disconnects when I try to reach the shared folder.",
        scope: "One person cannot access the shared folder."
      },
      expected: { status: "ambiguous", category: null }
    }
  ].map(sample => Object.freeze({
    ...sample,
    fields: Object.freeze({ scope: "", onset: "", error: "", workaround: "", ...sample.fields }),
    expected: Object.freeze(sample.expected)
  })));

  function valueOf(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function questionsFor(result, category = result.suggestedCategory) {
    const recorded = new Set(result.reported.map(fact => fact.field));
    const questions = factFields
      .filter(({ field }) => !recorded.has(field))
      .map(({ field, question }) => ({
        field,
        text: field === "scope" && Object.hasOwn(scopeQuestions, category) ? scopeQuestions[category] : question
      }));
    if (result.status === "unrecognized" && (!category || category === "other")) {
      questions.unshift({ field: "service", text: "Which service or device is affected, and what happened?" });
    }
    return questions;
  }

  function analyze(fields) {
    const subject = valueOf(fields?.subject);
    const description = valueOf(fields?.description);
    if (!subject || !description) throw new Error("Enter both a subject and a description.");

    // Only the reported request drives category suggestions. Structured facts
    // tell us which details are already present when drafting the reply.
    const text = `${subject}\n${description}`;
    const matches = rules.map(({ id, label, pattern }) => ({
      id,
      label,
      terms: [...new Set((text.match(pattern) || []).map(term => term.toLowerCase()))]
    })).filter(match => match.terms.length);
    const result = {
      suggestedCategory: matches.length === 1 ? matches[0].id : null,
      status: matches.length === 0 ? "unrecognized" : matches.length === 1 ? "suggested" : "ambiguous",
      matches,
      reported: factFields.map(({ field, label }) => ({ field, label, value: valueOf(fields[field]) }))
        .filter(fact => fact.value)
    };
    return { ...result, questions: questionsFor(result) };
  }

  function draftReply(result, reviewerCategory = result.suggestedCategory) {
    const questions = questionsFor(result, reviewerCategory);
    const opening = "Hi,\n\nThanks for reporting this.";
    const closing = "\n\nThank you,\nIT Support";
    if (questions.length === 0) {
      return opening + " The details you provided are enough for us to start reviewing the issue. We will get back to you if we need anything else." + closing;
    }
    const request = "\n\nCould you confirm the remaining details below? Please leave out passwords and authentication codes.\n\n";
    return opening + request + questions.map(({ text }, index) => `${index + 1}. ${text}`).join("\n") + closing;
  }

  function reviewBlocker(reply, draftVersion, currentVersion, category) {
    if (!categories.some(option => option.id === category)) return "Choose a category to finish review.";
    if (!valueOf(reply)) return "Add a draft reply to finish review.";
    if (draftVersion == null || draftVersion !== currentVersion) {
      return "The ticket or category changed. Generate a current draft or confirm that your edited reply matches.";
    }
    return "";
  }

  function evaluateSamples() {
    const rows = samples.map(({ id, title, fields, expected }) => {
      const { status, suggestedCategory } = analyze(fields);
      const actual = { status, category: suggestedCategory };
      const passed = status === expected.status && suggestedCategory === expected.category;
      return { id, title, expected, actual, passed };
    });
    const matched = rows.filter(({ actual }) => actual.status === "suggested").length;
    return {
      total: rows.length,
      passed: rows.filter(row => row.passed).length,
      matched,
      manual: rows.length - matched,
      rows
    };
  }

  const api = { categories, samples, analyze, questionsFor, draftReply, reviewBlocker, evaluateSamples };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TicketTriage = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
