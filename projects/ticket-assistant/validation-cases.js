(function (root) {
  "use strict";

  // These expected routes describe the reported problem before any rules run.
  const cases = [
    ["wireless-recurrence", "Connection drops again after a restart",
      "The office wireless worked for half an hour after restarting. It drops again whenever I move to the meeting room.",
      "network", "The restart brought temporary relief. The wireless connection is failing again."],
    ["keyboard-recurrence", "Keys are repeating again",
      "The keyboard was fixed this morning, but it is repeating letters again. The monitor still works.",
      "hardware", "The repaired keyboard has a current symptom. The monitor is working."],
    ["clear-pronoun", "Outgoing messages are stuck",
      "The VPN lost its connection earlier. It is working normally now. Outlook still will not send messages.",
      "email", "The sentence about recovery refers to the VPN. Outlook still has an active problem."],
    ["unclear-pronoun", "One of two problems came back",
      "The laptop had been freezing and the VPN had been disconnecting. Both were reported fixed yesterday. It stopped working again today, but I cannot tell which one.",
      null, "The latest sentence does not identify which of the two services is failing."],
    ["healthy-login-folder", "Cannot edit the budget folder",
      "I can log in to the portal and open my other folders. This shared folder says I do not have permission to edit it.",
      null, "Authentication and other folders work. The active issue is folder permissions, which has no dedicated category."],
    ["healthy-login-calendar", "Appointment changes do not save",
      "Signing in works every time. The calendar will not save changes to any appointment I create.",
      "email", "The requester can authenticate. The calendar is the service with the unresolved symptom."],
    ["active-lockout", "Blocked while opening the portal",
      "The current message says “Account is locked.” I can open the help page but cannot get to my profile.",
      "access", "The quoted message appears now and identifies an account lockout."],
    ["closed-quote", "Export fails this morning",
      "Yesterday's closed incident said “VPN connection drops.” The application crashes whenever I export a report today.",
      "software", "The VPN error was quoted from a closed incident. The current symptom happens during a report export."],
    ["conditional-advice", "Headset sound fades out",
      "The guide says to check the network if the call cuts out. My headset loses sound in the local audio test too.",
      "hardware", "The network advice is conditional. The headset also loses sound outside the call."],
    ["current-and-closed", "Two printers have different symptoms",
      "The upstairs printer was repaired last Tuesday. The printer at reception will not pull paper.",
      "hardware", "A different printer still fails, so the repair does not close the current hardware issue."],
    ["two-active", "Cannot type or connect",
      "The keyboard repeats keys even on the local desktop. The VPN also drops while I am working. Neither problem is fixed.",
      null, "The input and connection problems are both current and should be reviewed as separate symptoms."],
    ["conditional-recovery", "Portal recovery is uncertain",
      "The portal may be working again, but I have not been able to test it. The last error I saw said the password was rejected.",
      "access", "Recovery has not been verified. The last observed failure involved a rejected password."],
    ["unsupported-vocabulary", "Letters are missing from a message",
      "People can see my message, but every accented character is replaced by a square in the mailbox.",
      "email", "The rendering symptom occurs in the mailbox."],
    ["new-vocabulary", "Cannot reach anything upstairs",
      "Only the wall jack by the upstairs desk is affected. Moving the same cable to the adjacent wall jack restores access.",
      "network", "The failure follows one wired connection, while the same device and cable work on another connection."],
    ["common-monitor", "Monitor goes dark during use",
      "The monitor flickers and then goes dark even when the computer is idle.",
      "hardware", "The only reported symptom is with the monitor."],
    ["common-install", "Application setup will not finish",
      "The software installation pauses at 70 percent. Pressing Resume returns the same error.",
      "software", "The observed failure occurs during installation."],
    ["common-mailbox", "Shared mailbox cannot receive messages",
      "Outlook can send and receive personal mail. Nothing new arrives in the shared mailbox.",
      "email", "The shared mailbox is affected while personal mail still works."],
    ["no-affected-service", "It happened twice",
      "I saw the same thing before lunch and again on my next try. I could not capture any details.",
      null, "The report does not identify a service or describe the symptom."]
  ].map(([id, title, description, category, rationale]) => Object.freeze({
    id: `validation-${id}`,
    title,
    fields: Object.freeze({ subject: title, description, scope: "", onset: "", error: "", workaround: "" }),
    expected: Object.freeze({ category }),
    rationale
  }));

  Object.freeze(cases);
  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageValidationCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
