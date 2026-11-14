(function (root) {
  "use strict";

  // These expectations were assigned from the reported symptoms before any rules ran.
  const cases = [
    ["independent-startup-and-tunnel", "Two faults at the dispatch desk",
      "The scanner never gets past its opening splash screen, even when it is unplugged from the computer. Separately, the VPN session ends every time I connect from a different desk.",
      null, "The scanner startup failure and the VPN disconnect occur independently. A reviewer should decide whether to split the request."],
    ["independent-dock-and-wireless", "Charging and connection trouble",
      "My notebook only charges if I bypass the dock. The office wireless also disconnects on the spare notebook, which has never used that dock.",
      null, "Both the local charging fault and the wireless disconnect are observed under conditions that separate the two problems."],
    ["independent-auth-and-link", "Portal code and counter connection",
      "On a working connection the payroll portal rejects my current verification code. I also tested the wall jack at the counter with a second computer and neither computer gets a wired link.",
      null, "The rejected code and the failed wall jack were verified separately and need review across two categories."],
    ["two-local-devices", "Problems with two desk peripherals",
      "The mouse pointer stops every few seconds and the label scanner locks up while reading its own test label. The behavior is the same after I close all applications.",
      "hardware", "Both reported failures involve physical peripherals and share the hardware route."],
    ["scanner-symptom-with-healthy-tunnel", "Receiving labels are not captured",
      "The barcode reader lights up and beeps, but nothing appears in its local diagnostic window. I can connect to the VPN and use shared folders normally.",
      "hardware", "The reader fails in a local diagnostic while the remote connection succeeds."],
    ["instructions-and-observed-printer", "Labels come out blank",
      "The manual says to test the network when no jobs arrive. This printer receives the job, and the report printed from its own control panel is blank as well.",
      "hardware", "The printer produces blank output locally. The manual describes a different condition."],
    ["observed-application-before-advice", "Export closes the program",
      "The scheduling program exits whenever I save a report as a spreadsheet. Someone suggested testing the monitor if the picture disappears, but my desktop stays visible when the program closes.",
      "software", "The program exits consistently during export and the picture remains visible."],
    ["resolved-link-current-credentials", "Cannot proceed after entering a code",
      "The outage summary from Tuesday is closed and listed “Network is down.” I can load pages today. The portal now shows “The security code has expired.”",
      "access", "The network quote refers to a closed outage. The current diagnostic identifies an authentication issue."],
    ["resolved-account-current-wall-link", "Counter workstation cannot connect",
      "The sign in problem from the old case was fixed. The new problem is that whichever computer I connect to the counter wall outlet shows no Ethernet link.",
      "network", "The earlier authentication issue cleared. The link failure follows one connection point across computers."],
    ["two-current-quoted-errors", "Two warnings during the afternoon",
      "The printer still displays “Cover open” with its cover shut. In a separate test on a working connection the portal now displays “Your account has been disabled.”",
      null, "The printer warning and the current account warning concern different services and both require review."],
    ["current-network-quote-single-fault", "Connection drops during transfers",
      "My messages still load on the phone. On the desk computer the current VPN error reads “The connection was terminated by the remote peer” each time I start a file transfer.",
      "network", "The quoted disconnect is current and occurs in the VPN. Mail works on another device."],
    ["recurrence-after-device-repair", "The device is gone again",
      "We thought reseating the cable had restored the webcam. It vanished again while I was testing the camera preview without joining a call.",
      "hardware", "The apparent recovery was temporary. The camera disappears during a local test."],
    ["joint-recovery-uncertain-recurrence", "One of yesterday’s issues is back",
      "The keyboard and the wireless connection were both restored yesterday. Someone says it stopped working again, but I do not know which service they were testing.",
      null, "The newest report does not establish which of two previously affected services failed again."],
    ["shared-folder-with-working-authentication", "One team folder is inaccessible",
      "I can sign in, open my inbox and read the other team folders. This one folder shows “You do not have permission to view these files.”",
      null, "Authentication and other services work. The active issue is a resource permission with no dedicated category in the demo."],
    ["healthy-display-structured-access", "The next screen sends me back",
      "The screen shows every other page clearly. I get returned to the same portal step after approving the request on my phone.",
      "access", "The structured error identifies an identity check rather than a physical display failure.",
      { error: "Multifactor verification rejected because the approval request timed out." }],
    ["structured-and-independent-display", "Display and portal problems after lunch",
      "The monitor is black even during the computer’s startup screen. Separately, I can see the portal on another machine but cannot pass the approval step there.",
      null, "The local monitor and the account verification each show a distinct active symptom.",
      { error: "Verification code expired." }],
    ["software-installation-control", "Setup rolls back at the last step",
      "The program installer reaches 90 percent and then returns to its welcome page. Downloads and other applications continue to work.",
      "software", "The observed failure occurs in program installation while unrelated services work."],
    ["calendar-control", "Recurring invitation stays in drafts",
      "A new meeting invitation stays in the calendar outbox every time I choose Send. Regular email messages go out immediately.",
      "email", "The symptom is limited to calendar invitations."],
    ["wired-network-control", "The link light stays off under the lectern",
      "Two computers work from the adjacent network outlet using the same cable. Neither gets online when plugged into the data socket under the lectern.",
      "network", "Controlled swaps leave the faulty physical connection point as the shared factor."],
    ["insufficient-detail-control", "Could someone check the same thing",
      "It happened twice again this week. I could not make a note of what I was doing or which service was open.",
      null, "The report does not identify an affected service or give an observable symptom."]
  ].map(([id, title, description, category, rationale, facts]) => Object.freeze({
    id: `unseen-${id}`,
    title,
    fields: Object.freeze({
      subject: title, description, scope: "", onset: "", error: "", workaround: "", ...facts
    }),
    expected: Object.freeze({ category }),
    rationale
  }));

  Object.freeze(cases);
  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageUnseenCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
