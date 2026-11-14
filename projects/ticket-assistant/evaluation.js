(function (root) {
  "use strict";

  // These routes were chosen from the ticket details before running the existing rules.
  // A null category means a technician should decide where the request belongs.
  const cases = [
    ["guest-wireless", "Guest network stops loading",
      "Everyone in the training room loses internet access on the guest network.",
      "network", "The reported loss of internet access affects everyone on the guest network."],
    ["shared-mailbox", "Shared mailbox will not open",
      "People can read individual messages but Outlook says the shared mailbox is unavailable.",
      "email", "Messages still work individually. The shared mailbox is the service that needs attention."],
    ["repeating-auth", "Authentication prompt repeats",
      "After entering my password the portal asks for MFA over and over.",
      "access", "Repeated identity prompts keep the requester from completing authentication."],
    ["repeated-keys", "Keyboard repeats characters",
      "A single keypress makes the keyboard enter two or three letters.",
      "hardware", "The device produces repeated input when the requester presses one key."],
    ["installer-return", "Installation rolls back",
      "The installer reports an install error and returns to the first screen.",
      "software", "The problem occurs while installing the application."],
    ["two-problems", "Headset cuts out and VPN disconnects",
      "Both began after lunch. I cannot tell whether these symptoms are related.",
      null, "The request reports two distinct problems. Ask whether the requester needs two tickets."],
    ["little-context", "It happened again",
      "Can someone look at the issue from last week? I do not have the details.",
      null, "The request does not identify the affected service or symptom."],
    ["office-wireless", "Wireless drops in the meeting room",
      "Pages load at my desk. In the meeting room they stop loading until I reconnect to the office wireless.",
      "network", "Location and recovery after reconnecting point to wireless connectivity."],
    ["second-display", "Second screen stays dark",
      "The external display says no signal. Reseating the HDMI cable made no difference.",
      "hardware", "The reported issue concerns the external display and its physical connection."],
    ["calendar-laptop", "Calendar edits will not save",
      "The calendar shows the old appointment after saving. My laptop works normally otherwise.",
      "email", "The calendar has the symptom. The laptop is mentioned as working normally."],
    ["expired-code", "Training portal keeps rejecting the code",
      "The printer setup is finished, but I still cannot get into the training portal. It says my six digit code expired each time.",
      "access", "The expired access code blocks the requester. The printer work is already complete."],
    ["structured-lockout", "Cannot get to my work",
      "Every attempt stops at the same screen.",
      "access", "The structured error field identifies a lockout. The current rules only read the subject and description.",
      { error: "Account locked after authentication attempts." }],
    ["replacement-monitor", "Replacement monitor flickers",
      "The replacement monitor flickers while I work. The original screen is steady.",
      "hardware", "Only the replacement display is affected."],
    ["folder-permissions", "Unable to open finance folder",
      "I use a laptop. The shared folder says Access denied. My colleagues can open it.",
      null, "A folder permission issue needs manual routing because the demo has no dedicated permissions category."]
  ].map(([id, title, description, category, rationale, details]) => Object.freeze({
    id: `evaluation-${id}`,
    title,
    fields: Object.freeze({ subject: title, description, scope: "", onset: "", error: "", workaround: "", ...details }),
    expected: Object.freeze({ category }),
    rationale
  }));

  function evaluateChallenge(analyze) {
    const totals = { agreed: 0, extraReview: 0, unexpectedSuggestion: 0 };
    const rows = cases.map(ticket => {
      const actual = analyze(ticket.fields);
      const outcome = actual.suggestedCategory === ticket.expected.category ? "agreed" :
        actual.suggestedCategory === null ? "extraReview" : "unexpectedSuggestion";
      totals[outcome] += 1;
      return { ...ticket, actual, outcome };
    });
    return { total: rows.length, ...totals, rows };
  }

  const evaluation = { cases: Object.freeze(cases), evaluateChallenge };
  if (typeof module !== "undefined" && module.exports) module.exports = evaluation;
  else root.TicketTriageEvaluation = evaluation;
})(typeof globalThis !== "undefined" ? globalThis : this);
