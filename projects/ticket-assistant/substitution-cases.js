(function (root) {
  "use strict";

  // Each pair reports the same observations in a different order.
  const pairs = [
    ["jam-follows-original-reader", "Shipping station scan does not finish",
      "The sheet scanner stops during its own paper test. The shipping app displays No image received when I use that scanner.",
      "I plugged a spare scanner into the same cable, used the same document and clicked the same button in the shipping app. The image appeared normally.",
      "hardware", "The application succeeds when the only change is the scanner. The original scanner also fails a local test."],
    ["replacement-only-enumerates", "Capture button closes the records app",
      "The original scanner keeps restarting when I start its built in test. The records app also closes immediately when I click Capture.",
      "A spare scanner appeared on the device list. I have not tried the Capture button with that scanner.",
      null, "Detecting a replacement is a different action from completing a capture. The observations leave both a device fault and a potentially separate application fault."],
    ["software-fault-with-replacement", "Reports fail to finish at the service desk",
      "The document scanner hangs during its local setup. The reporting program also closes when I export a saved image.",
      "The spare scanner works and saves a fresh image, but the reporting program still closes on the same export. I can reproduce the export crash on a computer with no scanner attached.",
      null, "The original scanner fails locally. The export fault persists with a working replacement and with no scanner present."],
    ["startup-and-vpn-on-spare", "Registration desk has two interruptions",
      "The badge reader shows its first picture. The picture stays there and none of its buttons respond, even with every connection removed except power.",
      "Two volunteers on borrowed computers at another location are dropped from the VPN when they request the roster.",
      null, "The reader fails during isolated startup. The VPN disconnect occurs on different devices at another site."],
    ["alternate-connection-same-app-task", "Attendance page freezes after I save",
      "Saving the roster stalls exactly when the VPN session ends. The internal attendance page and our file browser then stop responding together.",
      "I connected directly at the office and saved the same roster from the same browser. Saving completes there and the file browser stays open.",
      "network", "Two services fail when the VPN disconnects. The same task succeeds with the same browser on a working connection."]
  ];

  const controls = [
    ["same-model-different-workflow", "The intake app quits while attaching a scan",
      "The old scanner cannot finish its own copy test. We made a plain copy successfully using a replacement of the same model. The intake app closes when I attach a scan, and nobody has attempted that action with the replacement.",
      null, "A successful device copy does not show whether the separate application action now works."],
    ["fault-follows-socket", "Network link never appears at the counter",
      "Two different computers show no Ethernet link when I use the counter outlet. I moved the same cable to the next outlet and both computers got a link. The test was repeated with a second cable.",
      "network", "The fault follows one outlet across controlled computer and cable swaps."],
    ["identity-follows-account", "Workflow stops at the confirmation prompt",
      "A coworker completes the same form on my computer using their own account. My request still fails at the same step from a spare computer.",
      "access", "The working account and alternate computer isolate the observed issue to authentication for this requester.",
      { error: "Verification request rejected during sign in because the account approval expired." }],
    ["repaired-reader-current-editor", "Rotating an image closes the editor",
      "The original reader has been fixed and it passes its built in image check. I can scan a page and save it. The editor closes when I rotate a saved image, including a file downloaded last month when no reader was attached.",
      "software", "The reader works now. The current failure occurs on an existing file without the reader."],
    ["permission-with-working-authentication", "Only the contracts folder will not open",
      "I signed in successfully on a second computer and opened the team drive. Other folders open there. The contracts folder still says that my account does not have permission to view it.",
      null, "Authentication and access to the drive work. The reported fault is access permission on one resource."],
    ["old-device-error-and-current-shared-inbox", "Team inbox will not send a reply",
      "Wednesday’s closed laptop request recorded “The screen is dark after sleep.” The replacement display works. Today a reply stays in the Outlook team mailbox outbox on both computers.",
      "email", "The display error belongs to closed work. The current symptom is specific to sending from the shared mailbox."],
    ["unclear-swap", "The replacement did not help",
      "The old note lists a print problem and an application error. I was told they swapped it and the problem happened again. Nobody wrote down which item was changed or what they tried.",
      null, "An unclear substitution and unnamed symptom do not identify a route."],
    ["two-peripheral-tests", "Two faults during equipment checks",
      "The keyboard skips letters when I type into the local test box. The label printer also jams when I press its own test button. Both tests still fail with the network cable disconnected.",
      "hardware", "Both observations are local equipment faults in the same category."],
    ["ordinary-installation", "The installer cancels when it checks the package",
      "The application installer reports an installation error and returns to its opening page. It behaves the same way when I use a fresh copy of the setup file.",
      "software", "The reported failure recurs during application installation."],
    ["ordinary-wireless", "WiFi drops only in the large classroom",
      "Five people lose internet access within a minute of joining the classroom WiFi. The same devices keep their connections in the lobby.",
      "network", "The loss of access appears across several devices at the same location."]
  ];

  const reordered = pairs.flatMap(([id, subject, first, second, category, rationale]) => [
    [`${id}-a`, `${subject} (order A)`, subject, `${first} ${second}`, category, rationale],
    [`${id}-b`, `${subject} (order B)`, subject, `${second} ${first}`, category, rationale]
  ]);
  const single = controls.map(([id, subject, description, category, rationale, facts]) =>
    [id, subject, subject, description, category, rationale, facts]);
  const cases = Object.freeze([...reordered, ...single].map(([id, title, subject, description, category, rationale, facts]) =>
    Object.freeze({
      id: `substitute-${id}`,
      title,
      fields: Object.freeze({
        subject, description, scope: "", onset: "", error: "", workaround: "", ...facts
      }),
      expected: Object.freeze({ category }),
      rationale
    })
  ));

  if (typeof module !== "undefined" && module.exports) module.exports = cases;
  else root.TicketTriageSubstitutionCases = cases;
})(typeof globalThis !== "undefined" ? globalThis : this);
