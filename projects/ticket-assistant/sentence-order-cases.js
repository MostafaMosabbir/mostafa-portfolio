(function (root) {
  "use strict";

  // These paired reports preserve the subject and facts while reversing their order.
  const pairs = [
    ["reader-startup-and-vpn", "Dispatch has two interruptions",
      "The handheld label reader comes on and shows its startup picture. It never reaches the reading menu, even after I unplug its data lead.",
      "At a different building I also get disconnected from the VPN on a borrowed laptop.",
      null, "The reader fails during isolated startup and the VPN disconnects on an unrelated device. Both need review."],
    ["printer-startup-and-vpn", "Problems at the welcome desk",
      "The ticket printer shows its boot logo as soon as it has power. Nothing happens after that. Its paper test button is unresponsive even with the computer turned off.",
      "Two receptionists trying from home both lose their VPN connection before they reach the staff drive.",
      null, "The printer cannot finish a local startup and two other people have a separate VPN problem."],
    ["vpn-and-dependent-stock-app", "Stock window stops refreshing",
      "Our stock application and the shared drive stop responding at the same moment that the VPN drops.",
      "I opened the same stock application and shared drive on the office network without the VPN. Both stayed available.",
      "network", "The application and drive work over another connection. Their failures track the VPN disconnect."],
    ["reader-and-dependent-label-app", "Shipping tool cannot see its reader",
      "The reader never reaches its ready indicator during startup, including when the workstation is shut down.",
      "The shipping application says No reader found with that reader but immediately detects the spare one.",
      "hardware", "The application detects a working device. The original reader fails its own startup first."],
    ["recovered-vpn-and-current-mailbox", "Shared mailbox does not open",
      "Yesterday the VPN dropped every few minutes. Support closed that incident and today the VPN has stayed connected during several file transfers.",
      "This morning Outlook displays “Cannot open this mailbox” whenever I select the team inbox. My personal inbox opens.",
      "email", "Current file transfers confirm the VPN works. The active symptom is specific to the team mailbox."],
    ["old-quote-and-current-application", "Spreadsheet closes during a report",
      "Monday’s closed printer ticket recorded “The device has a paper jam.” The printer makes a clean test page today.",
      "Right now the scheduling application shuts down every time I export a spreadsheet, including on a computer that has no printer.",
      "software", "The quoted printer error belongs to closed work. The export failure is current and also happens without a printer."]
  ];

  const controls = [
    ["current-account-warning", "Staff hub returns to the same step",
      "I can load other sites. On this one the same message appears each time I submit the phone confirmation. My coworker completes the process on this machine.",
      "access", "The current diagnostic identifies an account verification fault and the same computer works for a coworker.",
      { error: "Verification rejected because this account approval expired." }],
    ["old-ambiguous-reference", "Something stopped again yesterday",
      "Monday’s note mentions a label reader and a shared mailbox. My colleague says it failed yesterday, but did not write down which one or what they saw.",
      null, "The description never identifies which service failed. A reviewer needs to ask for an observed symptom."],
    ["one-current-device-two-past-faults", "The sign comes on and stays there",
      "We replaced the monitor and closed that old request. The VPN also works after the earlier repair. Today the visitor badge printer cannot get past the maker badge on its own display. Its local test button does nothing.",
      "hardware", "The monitor and VPN are working. The badge printer still cannot start a local test."],
    ["permission-after-successful-sign-in", "One folder refuses access",
      "I sign in successfully and can open two other folders on the drive. The archive alone says “Permission required to view these files.”",
      null, "The account can authenticate. The active issue is a resource permission without a category in this demo."],
    ["installation-control", "Editor setup keeps returning to the welcome page",
      "The application installer reports an installation error while unpacking its files and returns to the welcome page. This is the third attempt.",
      "software", "The repeated failure happens during application installation."],
    ["wireless-control", "Wireless drops in the auditorium",
      "Three of us lose internet access at the same time when connected to the auditorium WiFi. The same computers stay connected in the lobby.",
      "network", "The connectivity failure affects several devices and is specific to the auditorium."],
    ["calendar-control", "Meeting invitation stays in Outlook drafts",
      "A new calendar invitation remains in Drafts after I click Send. Ordinary email goes out immediately and existing invitations open.",
      "email", "The active failure is limited to sending a new calendar invitation."],
    ["peripheral-paper-control", "Test sheets crease inside the printer",
      "The printer pulls a sheet in and creases it behind the first roller. It does this when I run a test page using its buttons, even with the computer off.",
      "hardware", "The printer damages paper during its own local test."]
  ];

  const reordered = pairs.flatMap(([id, subject, first, second, category, rationale]) => [
    [`${id}-a`, `${subject} (order A)`, subject, `${first} ${second}`, category, rationale],
    [`${id}-b`, `${subject} (order B)`, subject, `${second} ${first}`, category, rationale]
  ]);
  const single = controls.map(([id, subject, description, category, rationale, facts]) =>
    [id, subject, subject, description, category, rationale, facts]);
  const cases = Object.freeze([...reordered, ...single].map(([id, title, subject, description, category, rationale, facts]) =>
    Object.freeze({
      id: `order-${id}`,
      title,
      fields: Object.freeze({
        subject, description, scope: "", onset: "", error: "", workaround: "", ...facts
      }),
      expected: Object.freeze({ category }),
      rationale
    })
  ));

  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageSentenceOrderCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
