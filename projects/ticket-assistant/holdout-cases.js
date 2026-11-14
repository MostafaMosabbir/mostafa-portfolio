(function (root) {
  "use strict";

  // Expected routes reflect the reported observations before any rules ran.
  const cases = [
    ["inventory-reader-and-remote-link", "Two faults at the returns counter",
      "Our handheld inventory reader shows the supplier wordmark the moment I turn it on. It has been there for ten minutes and the home view never comes up. The reader is on battery with nothing attached. In another department the VPN drops as soon as a colleague opens a remote session.",
      null, "The reader stops progressing during local startup. The VPN drops independently on a different device, so both routes need review."],
    ["receipt-unit-and-vpn", "The kiosk and remote access each fail",
      "The receipt printer powers on but stays on its company emblem instead of showing the paper settings. I removed its data lead and it still does this. Separately, my laptop loses its VPN connection even when I work away from the kiosk.",
      null, "The printer cannot finish starting even with its data connection removed. The laptop has a separate VPN problem."],
    ["local-reader-and-app-export", "The scanner works but export stops",
      "The document scanner saves sharp images through its built in test. Our claims application exits while generating a PDF from an image that was saved yesterday. The same export fails on a computer with no scanner connected.",
      "software", "The local scan is successful. The application exits on export with an existing file and without the device present."],
    ["startup-with-dependent-app", "Label scanner missing from station software",
      "The scanner will not advance beyond its welcome picture even when connected only to power. Our labeling program says it cannot find the scanner whenever it is in that state. I can use the program with the spare scanner.",
      "hardware", "The scanner startup problem is observed directly. The program works with different equipment and only reports the missing scanner."],
    ["monitor-and-login", "Display loss and a portal message",
      "The monitor loses its picture before the computer finishes starting. On a separate computer the display is clear, but the portal shows “Your account has been disabled” as I sign in.",
      null, "The physical display symptom and the account message occur independently. Each contributes a separate possible route."],
    ["inbox-only-on-failed-link", "Outlook disconnects when the tunnel falls",
      "Outlook stops receiving mail at the same moment the VPN drops. The file browser loses the remote drive too, and I can read the same mailbox over a working connection. I have no trouble sending messages when the VPN stays connected.",
      "network", "Several remote services fail only when the tunnel drops. The requester verified the mailbox works over another connection."],
    ["closed-account-current-wall-port", "No connection at a training desk",
      "We marked the old sign in ticket as resolved after the account was restored. Today both test workstations show no link on this wall port. I move the same Ethernet cable one desk over and the connection comes back.",
      "network", "The sign in issue was already resolved. The current physical link failure follows one wall port across computers."],
    ["closed-export-current-mailbox", "Shared inbox does not receive mail",
      "The earlier incident is closed. Its note said “The scheduling application shuts down during PDF export.” Today Outlook displays “Mailbox unavailable” when I open the shared inbox, even from the browser. The scheduling tool works.",
      "email", "The export symptom belongs to closed work. The current observed failure affects the shared mailbox in two interfaces."],
    ["current-error-account-only", "Unable to finish the second step",
      "This is the message I receive each time I try again. Other staff can complete the process from this workstation.",
      "access", "The diagnostic explicitly identifies a disabled account. The workstation works for other people.",
      { error: "Sign in blocked because your account has been temporarily disabled." }],
    ["guide-suggestion-real-app", "Saving the worksheet closes it",
      "A help article says to test the monitor if the screen goes dark. I can see the rest of the desktop throughout this issue. Only the spreadsheet application closes whenever I save a copy.",
      "software", "The display suggestion comes from a help article and the requester can still see the desktop. The application exits during a specific operation."],
    ["resolved-camera-current-wireless", "Camera fixed but the room still disconnects",
      "We replaced the webcam and it passes its local preview now. Everyone on the guest wireless gets disconnected when sitting at the end of the room. The same computers stay connected from the lobby.",
      "network", "The camera passed its local test. The current connectivity issue affects several people and follows the location."],
    ["current-quoted-install-and-printer", "Setup error and a separate printer alert",
      "The training installer currently says “Application installation failed while verifying the package.” On a separate test the printer itself says “Paper path blocked” when I run its copy test.",
      null, "The installation and paper path messages are current observations from separate tests and involve different categories."],
    ["working-account-one-folder-denied", "Only the archive folder refuses access",
      "I signed in to the portal and can open every other shared folder. The payroll archive says “Permission required to view these items” with that same account.",
      null, "Authentication works. A particular shared folder still refuses access, and the demo has no dedicated permissions route."],
    ["network-return-after-restart", "Remote session drops again",
      "The VPN worked for the first few minutes after the restart, but it disconnects during every transfer again. Ordinary printing continues to work.",
      "network", "The VPN symptoms returned after a temporary improvement. Printing is reported as working."],
    ["unidentified-returning-fault", "The same thing happened again",
      "Yesterday's note described both a display problem and a login problem. The reporter says “It happened again” and cannot say which screen was open or what failed.",
      null, "The current report is too vague to assign one of the two services mentioned in the earlier note."],
    ["account-control-mfa", "Approval prompts keep repeating",
      "My password is accepted, but the sign in process keeps asking for MFA even after my phone reports that the approval went through.",
      "access", "The observed failure occurs during authentication."],
    ["calendar-control-send", "Invitations stay in the calendar outbox",
      "New meeting invitations remain in the calendar outbox when I send them. Ordinary email still goes out and I can open existing appointments.",
      "email", "The problem is specific to sending calendar invitations."],
    ["physical-hardware-control", "Labels jam during the printer test",
      "The printer jams as soon as the sheet reaches its feed rollers. It does the same thing on a test page started from its own buttons.",
      "hardware", "The paper jam happens when the printer runs a test without help from another device."],
    ["software-control-install", "Editor setup stops at the end",
      "The application installer returns to its opening page after showing an installation error. The same setup package does this each time I run it.",
      "software", "The failure occurs repeatedly during application installation."],
    ["network-control-wifi", "WiFi drops on the top floor",
      "People on different computers lose internet access on the top floor WiFi. Their devices reconnect when they move downstairs.",
      "network", "A group of devices has the same wireless connectivity problem in one location."]
  ].map(([id, title, description, category, rationale, facts]) => Object.freeze({
    id: `holdout-${id}`,
    title,
    fields: Object.freeze({
      subject: title, description, scope: "", onset: "", error: "", workaround: "", ...facts
    }),
    expected: Object.freeze({ category }),
    rationale
  }));

  Object.freeze(cases);
  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageHoldoutCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
