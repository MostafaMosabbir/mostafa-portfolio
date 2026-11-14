(function (root) {
  "use strict";

  // Expected routes reflect the requester evidence before any rules ran.
  const cases = [
    ["handheld-reader-and-tunnel", "Receiving can neither scan nor connect remotely",
      "I powered up the handheld barcode reader on a clean bench. The menu never appears. The display just keeps showing the maker logo and the buttons do nothing, even after the data cable is removed. In the office next door, two coworkers get kicked out of the VPN on their laptops.",
      null, "The reader startup fault continues during a local test. Two other people observe the VPN fault independently."],
    ["receipt-printer-and-tunnel", "Two interruptions at the visitor desk",
      "We turned on the receipt printer and got its opening picture. It stays there. Pressing the test button makes no difference even when the printer is connected only to power. Separately, I tried the VPN on my phone and it disconnects as soon as I open the staff drive.",
      null, "The receipt printer is stuck during standalone startup. The staff drive test uses a separate device and demonstrates a VPN problem."],
    ["reader-and-dependent-label-app", "Labeling app cannot see the reader",
      "The reader’s status light blinks at startup and never changes. The device never shows its normal ready symbol, even with the computer off. Our labeling app shows No reader detected whenever this happens. The app sees our spare reader immediately.",
      "hardware", "The device fails locally, and the application detects a working replacement. Its message follows the reader fault."],
    ["dependent-remote-application", "Stock screens stop updating when connection ends",
      "The VPN disconnects at the same time that stock screens stop updating. A browser window loses an internal page at that moment too. Both come back when I reconnect, and I can use the same stock screens on the office connection.",
      "network", "Both remote services fail when the VPN disconnects and work on a functioning connection."],
    ["successful-reader-and-export", "Trying to export a shipping label closes the app",
      "The scanner can read and save a label to a local folder. The shipping app quits when I export a label that was saved yesterday. It quits the same way on a computer that has never had a scanner attached.",
      "software", "Local scanning works. Export fails with an existing file and on a computer without the device."],
    ["diagnostics-for-disabled-user", "Cannot finish the final step",
      "I get the same result each time. My colleague completes the process on this computer using their own account.",
      "access", "The diagnostic points to a disabled account. Another account can complete the same process on the same computer.",
      { error: "Access blocked because this user account is disabled." }],
    ["resolved-port-current-password", "Unable to open the payroll portal today",
      "The wall jack problem from Monday is fixed. The computer gets a link and other pages load. The payroll portal accepts my username but shows “Password expired” when I submit my password today.",
      "access", "The physical link and ordinary web access are working. The current password message prevents access to the portal."],
    ["resolved-identity-current-outlet", "Both machines lose their wired connection here",
      "The sign in case was closed after my account was restored. My current problem starts when I plug either of two computers into the outlet by the service counter. Neither shows a link there. With the same cable, both work from the next outlet.",
      "network", "The prior account problem was resolved. The current symptom follows one wired outlet across computers and cables."],
    ["resolved-desktop-current-outbox", "Shared inbox cannot send a reply",
      "We replaced the broken desktop last week and closed that request. Today the reply sits in the shared mailbox outbox. My personal Outlook mailbox sends messages on the same computer.",
      "email", "The former desktop fault is resolved. Sending remains broken in one shared mailbox while the personal mailbox works."],
    ["advice-on-outlet-current-paper", "Paper is folded inside the printer",
      "The quick guide advises checking the wall port when jobs are missing. My jobs arrive. The printer folds the page at the rollers, even when I print a status sheet with the cable removed.",
      "hardware", "Jobs reach the printer and the paper defect occurs locally. The guide only describes a hypothetical link problem."],
    ["genuine-camera-and-account", "Two tests failed during training",
      "The webcam preview stays black with no meeting open. I verified that on a spare computer too. On another computer my camera works, but the training portal shows “Verification request rejected” after I approve it on my phone.",
      null, "The camera fails in a local test. The verification error occurs on a different computer with a working camera."],
    ["date-quote-current-editor", "Editor closes when I paste a table",
      "Last week's closed mailbox note said “The shared inbox is unavailable.” I can open the inbox today. The editor vanishes every time I paste a table into a blank document, even after I close Outlook.",
      "software", "The quoted mailbox failure is historical. The observed failure occurs in the editor with Outlook closed."],
    ["healthy-identity-resource-permission", "One training folder refuses access",
      "I can sign in to the portal and reach our shared drive. The training folder alone shows “You do not have permission.” Another folder on that same drive opens.",
      null, "Authentication and shared drive access work. A resource permission needs review because the demo has no dedicated permissions category."],
    ["unclear-old-device-reference", "Can we reopen yesterday’s request",
      "The previous note mentions a label printer and a card reader. Today someone said it stopped again. I do not know which one they tested or what they saw.",
      null, "The only new report gives an unclear reference and no symptom. A reviewer needs to identify the affected device."],
    ["app-failure-with-secondary-monitor", "Video review tool freezes on a preview",
      "The main display and the spare monitor both keep showing the desktop. Only the video review app freezes when I scrub the timeline of one clip. It still freezes if I use the laptop screen alone.",
      "software", "The desktops remain visible across displays. The application hangs during a repeatable operation."],
    ["ordinary-account-loop", "Sign in returns to another approval",
      "After I enter my password and accept the MFA request, the portal gives me a fresh approval prompt instead of letting me in. It happens in two browsers.",
      "access", "The repeated approval prompt blocks authentication."],
    ["ordinary-calendar-recurrence", "A recurring meeting invitation will not go out",
      "New recurring calendar invitations stay in the Outlook outbox after I send them. I can send a regular email and open the same calendar.",
      "email", "The failure is limited to sending new meeting invitations."],
    ["ordinary-peripheral-feed", "The paper does not advance",
      "The printer pulls in the sheet and then jams. It behaves the same way when I use its buttons to print a test page.",
      "hardware", "The printer jams during its own standalone test."],
    ["ordinary-installation", "The application installer returns to the first page",
      "On both attempts, the installer showed an installation error while unpacking the application and then returned to its first page.",
      "software", "The observed failure recurs during one installation step."],
    ["ordinary-wireless", "The WiFi connection drops in one room",
      "Three of us lose internet service on the same WiFi in the meeting room. The same computers stay connected when we move into the hall.",
      "network", "The common connectivity symptom occurs in one location across devices."]
  ].map(([id, title, description, category, rationale, facts]) => Object.freeze({
    id: `review-${id}`,
    title,
    fields: Object.freeze({
      subject: title, description, scope: "", onset: "", error: "", workaround: "", ...facts
    }),
    expected: Object.freeze({ category }),
    rationale
  }));

  Object.freeze(cases);
  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageTransferReviewCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
