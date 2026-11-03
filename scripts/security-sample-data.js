// Generated from the fictional assessment. Do not enter real company data.
window.securitySampleData = {
  "as_of": "2026-10-28",
  "scenarios": [
    {
      "title": "MFA Coverage Verification",
      "requirement_id": "REQ-007",
      "requirement": "Require MFA for the in-scope human advertising-account logins.",
      "state": "needs_work",
      "claims": [
        {
          "control_id": "CTL-007",
          "status": "implemented",
          "owner": "Demo IT owner",
          "statement": "Fictional scenario: advertising-account mfa is recorded as operating for the defined demo scope.",
          "target_date": "",
          "evidence_ids": []
        }
      ],
      "gaps": [
        "CTL-007: evidence reference is missing."
      ],
      "actions": [
        {
          "action_id": "ACT-005",
          "requirement_id": "REQ-007",
          "action": "Collect and map evidence of MFA coverage.",
          "owner": "Demo identity administrator",
          "due_date": "2026-11-15",
          "status": "planned",
          "verification_criteria": "Review in-scope login coverage and exceptions before linking the evidence record to CTL-007."
        }
      ]
    },
    {
      "title": "Freelancer Access Review",
      "requirement_id": "REQ-008",
      "requirement": "Review freelancer permissions to client campaign folders.",
      "state": "needs_work",
      "claims": [
        {
          "control_id": "CTL-008",
          "status": "implemented",
          "owner": "",
          "statement": "Fictional scenario: freelancer access review is recorded as operating for the defined demo scope.",
          "target_date": "",
          "evidence_ids": [
            "EV-008"
          ]
        }
      ],
      "gaps": [
        "CTL-008: owner is missing."
      ],
      "actions": [
        {
          "action_id": "ACT-006",
          "requirement_id": "REQ-008",
          "action": "Assign accountability for freelancer access reviews.",
          "owner": "Demo operations lead",
          "due_date": "2026-11-15",
          "status": "planned",
          "verification_criteria": "Confirm the owner accepts responsibility and review the latest permissions review record."
        }
      ]
    },
    {
      "title": "Backup Restoration Testing",
      "requirement_id": "REQ-010",
      "requirement": "Record protected campaign-file backups and a restore test.",
      "state": "needs_work",
      "claims": [
        {
          "control_id": "CTL-010",
          "status": "partial",
          "owner": "Demo IT owner",
          "statement": "Fictional scenario: campaign backup and restore exercise is incomplete; coverage and verification work remain.",
          "target_date": "2026-11-10",
          "evidence_ids": [
            "EV-010"
          ]
        }
      ],
      "gaps": [
        "CTL-010: status is partial; do not claim implementation."
      ],
      "actions": [
        {
          "action_id": "ACT-008",
          "requirement_id": "REQ-010",
          "action": "Complete protected backup coverage and perform a restore test.",
          "owner": "Demo IT owner",
          "due_date": "2026-11-15",
          "status": "planned",
          "verification_criteria": "Review backup scope, protection settings and a documented successful restore test."
        }
      ]
    },
    {
      "title": "Alert Correlation Mapping",
      "requirement_id": "REQ-012",
      "requirement": "Correlate campaign account alerts with identity activity.",
      "state": "needs_work",
      "claims": [],
      "gaps": [
        "No control mapped; document an approach and assign a control owner."
      ],
      "actions": [
        {
          "action_id": "ACT-009",
          "requirement_id": "REQ-012",
          "action": "Define and map an alert-correlation control.",
          "owner": "Demo security lead",
          "due_date": "2026-11-15",
          "status": "planned",
          "verification_criteria": "Test a fictional alert scenario; record ownership, implementation and reviewed evidence before mapping the control."
        }
      ]
    },
    {
      "title": "Investigation Evidence Review",
      "requirement_id": "REQ-014",
      "requirement": "Keep a tamper-evident record of investigation actions.",
      "state": "needs_work",
      "claims": [
        {
          "control_id": "CTL-014",
          "status": "implemented",
          "owner": "Demo IT owner",
          "statement": "Fictional scenario: investigation activity journal is recorded as operating for the defined demo scope.",
          "target_date": "",
          "evidence_ids": [
            "EV-014"
          ]
        }
      ],
      "gaps": [
        "EV-014: evidence has not passed recorded human review."
      ],
      "actions": [
        {
          "action_id": "ACT-010",
          "requirement_id": "REQ-014",
          "action": "Address the rejected investigation-record evidence.",
          "owner": "Demo incident lead",
          "due_date": "2026-11-15",
          "status": "planned",
          "verification_criteria": "Resolve reviewer objections and submit a replacement record for a new human review."
        }
      ]
    }
  ]
};
