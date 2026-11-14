(function (root) {
  "use strict";

  // The expected route reflects the reported facts a technician would see.
  // These fictional requests were labeled before running any routing rules.
  const cases = [
    ["scanner-and-remote-access", "Two problems in the intake room",
      "The barcode scanner gets stuck on its startup logo even with its data cable unplugged. Separately, the VPN drops as soon as I connect from either computer.",
      null, "The scanner fails by itself and the VPN disconnects on two computers. A technician should assess the two requests separately."],
    ["remote-access-and-dock", "The dock and remote access both fail",
      "The remote connection drops even when I use the spare laptop. On my usual desk, the dock also stops charging the laptop during a local task.",
      null, "The remote connection and the charging failure each occur independently."],
    ["one-scanner-symptom", "Batch scan never leaves the tray",
      "The scanner starts a batch and then jams before reading the first sheet. The staff wireless works as usual.",
      "hardware", "A paper jam is observed at the scanner. The wireless service works."],
    ["old-code-current-wired", "Workstations cannot get online at the front desk",
      "A resolved note from last Thursday recorded “Verification code expired.” Today, two workstations lose internet as soon as either is connected to the wall plate at the front desk.",
      "network", "The access code was a distinct resolved issue. The current symptom follows a wired connection point."],
    ["current-code-old-network", "Access request returns me to the start",
      "The earlier closed report said “WiFi is unavailable.” The error displayed after I enter the current approval code is “Your verification link has expired.”",
      "access", "The currently displayed error concerns verification. The wireless outage belongs to closed work."],
    ["open-quote-current-hardware", "Two service issues still open",
      "The open ticket says “VPN session disconnected.” That happened again today. During a local recording on the same day, the microphone stopped picking up sound.",
      null, "The prior quote refers to an open issue that has recurred. The local microphone failure is a separate symptom."],
    ["tentative-recurrence-camera", "Camera stopped appearing again",
      "Support thought the USB camera was repaired after swapping the cable. It disappeared again from the local camera preview the next morning.",
      "hardware", "The peripheral disappeared again during a local test after an apparent recovery."],
    ["tentative-recurrence-identity", "Access fix lasted for one login",
      "The reset seemed to solve the password problem yesterday. This morning it is rejecting the same credentials again before the home page loads.",
      "access", "The recovery was temporary, and the current problem again occurs at authentication."],
    ["competing-referents", "One of the two problems is back",
      "The keyboard and the VPN were both repaired. Someone said it failed again this morning, but I do not know which service they meant.",
      null, "The recurrence has no clear referent and could belong to either category."],
    ["physical-link-follows-outlet", "No link at the counter station",
      "The connection light stays dark when either of our workstations uses the data outlet beneath the till. Both workstations connect on the outlet at the next desk.",
      "network", "The same physical connection point fails for multiple devices."],
    ["ethernet-link-and-monitor", "Display has no picture",
      "The ethernet status light stays green and I can load pages. The monitor says “No signal” before I even open an application.",
      "hardware", "The wired link and internet are working. The monitor has the current failure."],
    ["structured-install-screen", "The next screen never opens",
      "The third step takes me back to the start. The monitor displays every other page correctly.",
      "software", "The recorded error identifies the installation. Screen refers to a step in that process.",
      { error: "Install error while copying application components." }],
    ["structured-identity-display", "Stuck on the screen after entering my name",
      "I can open the help page without a problem. I cannot get past the next prompt on the portal.",
      "access", "The diagnostic message identifies an account verification block. The word screen describes the portal view.",
      { error: "Account verification denied after too many attempts." }],
    ["structured-conflict", "Printer problem and separate portal warning",
      "The local printer feeds paper sideways, and I also cannot open my account on another computer.",
      null, "The printer symptom and the account warning identify distinct problems. Both need review.",
      { error: "Your account is locked." }],
    ["unrelated-hardware-context-mail", "Cannot send from the shared mailbox",
      "I just moved to a new laptop and the device works fine. Outlook opens, but when I send from the shared mailbox the message stays in the outbox.",
      "email", "The observed failure is limited to sending from a shared mailbox. The requester confirms the device works."],
    ["unrelated-checklist-scanner", "Scan carriage stops partway through",
      "The instructions say to test internet access if a page cannot load. My scanner carriage stalls halfway through every scan I start from its control panel.",
      "hardware", "The advice concerns a hypothetical internet issue. The observed scanner fault occurs locally."],
    ["ordinary-calendar", "Calendar invite disappears after sending",
      "After I send a meeting invitation, it vanishes from my Outlook calendar. My existing appointments still appear.",
      "email", "The symptom affects calendar invitations."],
    ["ordinary-software", "Export button crashes the application",
      "The inventory application crashes whenever I export a report. It opens normally and I can view all of the records.",
      "software", "The reported application failure occurs during export."],
    ["ordinary-network", "Guest wireless refuses new connections",
      "Everyone at the training table lost internet at once and their wireless connections refused to reconnect.",
      "network", "Several devices on the same wireless connection share an observed connectivity failure."],
    ["no-observed-issue", "Request for a call when someone is free",
      "Could someone call me about the thing we discussed yesterday? I do not have any more details.",
      null, "The request does not identify an affected service or a symptom."]
  ].map(([id, title, description, category, rationale, facts]) => Object.freeze({
    id: `novel-${id}`,
    title,
    fields: Object.freeze({
      subject: title, description, scope: "", onset: "", error: "", workaround: "", ...facts
    }),
    expected: Object.freeze({ category }),
    rationale
  }));

  Object.freeze(cases);
  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageNovelCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
