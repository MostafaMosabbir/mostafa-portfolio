(function (root) {
  "use strict";

  // Set the expected category from the requester evidence before running any routing rules.
  const cases = [
    ["guide-before-observation", "No sound during the built in audio test",
      "Our guide recommends checking the VPN whenever a call goes quiet. The USB headset is silent in the local audio test with the call closed.",
      "hardware", "The reported observation occurs in a local audio test. The VPN mention is general advice."],
    ["guide-after-observation", "The payroll import quits",
      "The payroll application crashes on every import. The guide says to reboot the router when a web page stops loading, but web pages load normally here.",
      "software", "The application crash is the actual incident. The router advice describes a condition the requester did not observe."],
    ["observed-network-after-advice", "The workstation loses its wired connection",
      "A repair note says to swap the monitor if its picture goes away. The picture is fine. Internet service drops whenever I plug into the cable under the counter.",
      "network", "The display works. The internet connection is the service reported to fail."],
    ["old-quote-current-mail", "Shared mailbox cannot show new messages",
      "The closed report from Monday read “network connection drops every hour.” This morning the shared mailbox stalled, while personal mail still arrives.",
      "email", "Only the mailbox symptom is current. The network problem appears in a closed report."],
    ["current-lockout-quote", "My profile is inaccessible",
      "The first thing on the screen right now is “Your account has been locked.” My teammate can open their profile.",
      "access", "The current message identifies a lockout for one requester."],
    ["old-and-current-quotes", "I cannot finish opening the training portal",
      "Our resolved ticket said “printer offline.” The message in the portal today is “Authentication failed.”",
      "access", "The printer message belongs to resolved work. The current quoted message points to an authentication issue."],
    ["peripheral-recurrence", "Input device fault returned",
      "Support thought the desktop keyboard was fixed after trying a different USB port. It misses letters again even in a blank local document.",
      "hardware", "The repair was tentative and the peripheral symptom has returned during local use."],
    ["identity-recurrence", "The portal blocks me again today",
      "My password worked just after the reset yesterday. This morning the portal rejects it again before I can reach my profile.",
      "access", "Earlier success was temporary. The current failure happens during authentication."],
    ["shared-device-category", "Two peripherals are acting up",
      "At the reception computer, the keyboard repeats each keypress and the USB mouse stops moving every few minutes.",
      "hardware", "Both issues concern input devices and share the same routing category."],
    ["independent-active-issues", "Cannot connect or scan documents",
      "The VPN disconnects even on my other computer. The document scanner is also stuck on its calibration screen when I use it locally.",
      null, "These are two independently observable problems. A person should decide whether to split the request."],
    ["single-wired-port", "Only the ethernet socket by the podium fails",
      "Two different computers lose their wired connection when using that wall socket. The same cable works on the socket by the door.",
      "network", "The issue follows one connection point across devices and cables."],
    ["display-despite-cable", "Monitor loses the picture when it wakes",
      "I unplugged the ethernet cable for a quick check, and the monitor still says no signal when waking. The wired connection works again after plugging it back in.",
      "hardware", "The primary symptom is the display. Disconnecting the network cable was a temporary check."],
    ["healthy-account-limited-folder", "I can get to the portal but not the project folder",
      "I signed in successfully and can view public folders. The restricted project folder says I am not permitted to open it.",
      null, "Authentication succeeds. The request is about a resource permission, which has no dedicated route in the demo."],
    ["different-users-account", "Colleague stays locked out",
      "I can log in to the same portal. My colleague receives “Account disabled” before their home page loads.",
      "access", "The healthy login belongs to a different person. The affected account is disabled."],
    ["uncertain-after-repair", "One of our two issues has returned",
      "The display and the connection were both fixed on Friday. It will not come back today, but I am unsure which one failed.",
      null, "The pronoun has two plausible referents. The requester cannot identify which service needs attention."],
    ["no-identifiable-issue", "Can someone reach me after lunch",
      "Something went wrong again and I did not get a chance to write down any details. Please call when convenient.",
      null, "There is no affected service or observable symptom to route."],
    ["straight-calendar", "Calendar invitation stays in drafts",
      "New meeting invitations stay in Outlook drafts when I try to send them. Existing appointments still show up.",
      "email", "The problem affects calendar invitations."],
    ["straight-install", "Software installation returns to the welcome screen",
      "The installer reports an install error when it starts copying the application files.",
      "software", "The installation reports a current error."],
    ["straight-network", "Guest internet drops during the meeting",
      "Three people connected to guest WiFi lost internet access at once and could not reconnect.",
      "network", "Several people report the same connectivity symptom."],
    ["structured-identity-message", "The second screen will not clear",
      "I get stopped at the same step every time. The support checklist suggested checking the network even though the help page loads.",
      "access", "The current error identifies identity verification. The checklist advice alone does not establish a network fault.",
      { error: "Verification code expired." }]
  ].map(([id, title, description, category, rationale, facts]) => Object.freeze({
    id: `transfer-${id}`,
    title,
    fields: Object.freeze({
      subject: title, description, scope: "", onset: "", error: "", workaround: "", ...facts
    }),
    expected: Object.freeze({ category }),
    rationale
  }));

  Object.freeze(cases);
  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageTransferCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
