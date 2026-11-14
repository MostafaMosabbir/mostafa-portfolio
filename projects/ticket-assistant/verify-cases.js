(function (root) {
  "use strict";

  // Expected routes were assigned from the reported facts before running the rules.
  const cases = [
    ["scanner-startup-and-vpn", "Receiving station reports two faults",
      "With nothing plugged into it except power, the barcode reader sits on the maker’s name and never reaches its menu. On a spare computer in another room, the VPN also disconnects before I can reach the shared drive.",
      null, "The reader fails at startup while disconnected from all computers. The VPN disconnect was observed separately and also needs review."],
    ["scanner-app-and-connection", "Scans never reach the remote queue",
      "The scanner reads and saves every page to a local folder. The upload stops only when the VPN drops, and a second computer loses the same VPN session without any scanner attached.",
      "network", "Local scans succeed. The VPN failure occurs even on a computer with no scanner."],
    ["dock-and-editor", "Cannot charge or finish editing",
      "The battery drains whenever the notebook is plugged into the dock, even with all apps closed. The drawing program also exits on a spare computer when I open the same project.",
      null, "A separately observed charging issue and application failure involve two categories."],
    ["two-hardware-symptoms", "Equipment at the returns desk",
      "The scanner feeder pulls in multiple sheets even during its own copy test. The keyboard at the same desk misses the space bar during the computer’s built in keyboard test.",
      "hardware", "Both failures happen during local device tests. They share the hardware category."],
    ["physical-display-and-identity", "A screen fault and a portal error",
      "The monitor is dark during the startup logo even with the portal closed. On another computer the display works, but my access attempt stops at a different step.",
      null, "There is a distinct local display failure. The observed error on the working computer also points to account access.",
      { error: "The one time access code was rejected after account verification." }],
    ["closed-lockout-current-port", "Wired link at the packing desk",
      "We closed the account incident on Tuesday. The old note read “Your account is locked.” Today both test computers show no wired connection at the packing desk socket. Using the same cable at the next socket brings the link up.",
      "network", "The account quote is from closed work. The current connectivity failure follows a single socket."],
    ["live-identity-quote", "Unable to reach the staff hub",
      "I can load other pages. Right now the hub says “The temporary sign in code is no longer valid” each time I type it.",
      "access", "The quoted message is current and describes authentication failure while general connectivity works."],
    ["advice-versus-app-failure", "Cannot finish saving a workbook",
      "The help page tells me to inspect the monitor if the picture disappears. My picture stays steady. The spreadsheet application closes each time I save as a template, even on another display.",
      "software", "The help page describes a hypothetical display fault. The repeated application exit is the observed issue."],
    ["app-guess-versus-network", "The room loses connectivity",
      "A colleague guessed that our calendar software needed an update, but the browser and chat both stop connecting whenever we use the room’s WiFi. The same computers reconnect when we leave the room.",
      "network", "The reported loss of WiFi affects multiple applications and follows the location. The software suggestion is speculative."],
    ["replaced-equipment-current-email", "Shared inbox does not update",
      "The old monitor was replaced on Friday and the new one looks fine. Today Outlook shows no new messages in the shared mailbox, even when I check from the web.",
      "email", "The display repair is complete. The shared mailbox remains affected in more than one interface."],
    ["working-auth-permission-denied", "Records folder is blocked",
      "The same account signs in and opens two other shared folders. Only the records folder refuses access and its message says I lack permission.",
      null, "Authentication succeeds. A restricted shared folder needs manual routing because permissions have no dedicated category."],
    ["independent-current-quotes", "Two alerts this morning",
      "The printer panel still displays “Tray sensor blocked” after I check the tray. In a separate test from another building the staff portal says “Account suspended” when I sign in.",
      null, "Both quoted messages are current. They show separate device and account faults."],
    ["temporary-network-recovery", "Remote session kept dropping again",
      "The VPN stayed up for one file transfer after the reboot. It then started cutting the session off again during each transfer. Printing has worked all morning.",
      "network", "The VPN failure recurs after temporary relief. Printing is working."],
    ["diagnostic-only-application", "Unable to finish onboarding",
      "I saved the message that appears on the final step.",
      "software", "The error is the only field that identifies an affected service, and it describes a failed installation.",
      { error: "Application installation failed because a required component could not be unpacked." }],
    ["unnamed-recurrence", "A problem returned in the morning",
      "We reopened a note that listed a stalled installer and a printer that stopped responding. It failed again today. I do not know which one my colleague was testing.",
      null, "The pronoun could refer to either of two reported problems. The new failure needs clarification."],
    ["calendar-control", "Meeting invitations stay in my outbox",
      "New calendar invitations stay in the outbox after I send them. I can send ordinary email and open older meetings.",
      "email", "The observed failure is limited to sending new calendar invitations."],
    ["network-control", "Guest wireless drops every few minutes",
      "Three of us lose internet access on the guest wireless at the same time. It reconnects briefly before dropping again.",
      "network", "Several users report a recurring connectivity loss on the same wireless network."],
    ["hardware-control", "Print output has a black stripe",
      "The printer produces a black stripe on its own test page as well as on documents sent from my computer.",
      "hardware", "The visible print defect persists in the device’s own test."],
    ["software-control", "The editor closes whenever I export",
      "The application crashes during PDF export. Opening and editing the same document works, and the export already fails before I choose a destination.",
      "software", "The application fails consistently during one operation."],
    ["access-control", "Password accepted but verification loops",
      "After entering my password, the staff portal keeps prompting me to approve MFA even after my phone confirms the approval.",
      "access", "A repeated verification challenge prevents successful account access."]
  ].map(([id, title, description, category, rationale, facts]) => Object.freeze({
    id: `verify-${id}`,
    title,
    fields: Object.freeze({
      subject: title, description, scope: "", onset: "", error: "", workaround: "", ...facts
    }),
    expected: Object.freeze({ category }),
    rationale
  }));

  Object.freeze(cases);
  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageVerifyCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
