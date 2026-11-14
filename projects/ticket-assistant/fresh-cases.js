(function (root) {
  "use strict";

  // Expected routes were set from the unresolved symptoms before running the revised rules.
  const cases = [
    ["remote-disconnect", "Cannot stay connected remotely",
      "The shared mailbox was restored this morning. The VPN now disconnects whenever I open the training site.",
      "network", "The mailbox repair is complete. The loss of the remote connection is the current problem."],
    ["monitor-blackout", "Conference room screen goes black",
      "The conference room monitor keeps going black. Email is working again after yesterday's issue.",
      "hardware", "The monitor is still failing. The email problem is already resolved."],
    ["printer-negation", "Forms will not print",
      "The printer is not working. The calendar is fine for everyone.",
      "hardware", "The words not working describe the printer failure. The calendar is unaffected."],
    ["vpn-recurrence", "Connection problem came back",
      "The VPN worked after a restart, but the VPN dropped again ten minutes later. My mailbox opens normally.",
      "network", "The restart helped temporarily. The connection then failed again."],
    ["mailbox-reversal", "New problem this morning",
      "The VPN disconnected yesterday. It is stable now, but the shared mailbox still will not open.",
      "email", "Access to the mailbox remains blocked after the connection stabilized."],
    ["quoted-history", "Training portal rejects credentials",
      "The last ticket said “printer unavailable” and was closed. Right now the portal will not accept my password.",
      "access", "The printer error is a quote from a closed ticket. The new password failure belongs with account access."],
    ["quoted-advice", "Update stalls before completing",
      "The training guide says “check your WiFi”, but the software installation stalls at the same screen even on a wired connection.",
      "software", "The wireless mention is a quote from a guide. The observed failure occurs during installation."],
    ["unchecked-history", "Disconnecting while working from home",
      "The keyboard sometimes sticks, but I have not checked it today. Today the VPN disconnects when I connect from home.",
      "network", "The keyboard is background context with no confirmed new problem. The current request reports VPN disconnects."],
    ["two-active-issues", "Two issues are holding up work",
      "The VPN disconnects, and my keyboard enters the wrong keys even when I am disconnected. Both are blocking work.",
      null, "Both symptoms are current and appear distinct. A technician should decide whether to split the ticket."],
    ["no-specific-symptom", "It happened again this afternoon",
      "The same thing happened after lunch. I cannot describe which system it was on.",
      null, "The request gives a time but no affected service or symptom."],
    ["lobby-wireless", "Connection fails at the front desk",
      "My phone tethering works. The secure wireless in the lobby refuses to join.",
      "network", "One connection works while the office wireless connection fails."],
    ["structured-auth-error", "Stuck at the second prompt",
      "The second prompt will not clear. The network is connected.",
      "access", "The reported error identifies an expired identity approval. The network is available.",
      { error: "MFA request expired before it could be approved." }],
    ["permission-route", "Cannot open a shared folder",
      "I can sign in normally, but the shared folder says I lack permission even after selecting it.",
      null, "Authentication works. The request describes a folder permission issue without a dedicated category in this demo."],
    ["export-crash", "Export step closes unexpectedly",
      "The calendar and mailbox are OK, but the application crashes when I open the export screen.",
      "software", "The symptom occurs in the export application after the user confirms that mail and calendar work."],
    ["all-repaired", "Checking in after repairs",
      "Last week the printer stopped and the VPN dropped. Both problems were fixed and I have no symptoms now.",
      null, "The report confirms recovery of both services and describes no active incident."]
  ].map(([id, title, description, category, rationale, details]) => Object.freeze({
    id: `fresh-${id}`,
    title,
    fields: Object.freeze({ subject: title, description, scope: "", onset: "", error: "", workaround: "", ...details }),
    expected: Object.freeze({ category }),
    rationale
  }));

  Object.freeze(cases);
  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageFreshCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
