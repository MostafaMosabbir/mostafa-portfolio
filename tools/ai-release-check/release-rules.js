(function () {
  'use strict';

  const checkDefinitions = [
    {
      id: 'credentials',
      title: 'Browser credentials',
      prompt: 'Where are private API credentials used?',
      evidence: 'Review the files delivered to the browser and confirm the service credential is available only to the server.',
      choices: [
        ['browser', 'A private credential is in the browser', 'block', 'Visitors can retrieve credentials delivered with the site.', 'Move the credential to server secret storage. Revoke and replace any key that was exposed.'],
        ['server', 'Server only, with release files checked', 'pass', 'The recorded review keeps private credentials on the server.', 'Repeat the release file check whenever the build changes.'],
        ['none', 'This feature uses no private credentials', 'not_applicable', 'The feature has no private credential to store.', 'Revisit this check if a credential is added.'],
        ['unknown', 'Location is unverified', 'review', 'Credential placement has not been verified.', 'Inspect the release files and server configuration.']
      ]
    },
    {
      id: 'data',
      title: 'Sensitive data',
      prompt: 'What does the assistant send to the model or keep in logs?',
      evidence: 'Document the input fields, who can access logs, any redaction, and what the provider retains.',
      choices: [
        ['fictional', 'Fictional records only, including logs', 'pass', 'The recorded data flow uses fictional records only.', 'Repeat the data review before introducing real records.'],
        ['approved', 'An approved and documented data flow', 'pass', 'The recorded data flow has documented approval and limits.', 'Check those limits whenever inputs, logging, or providers change.'],
        ['unapproved', 'Sensitive records without approval', 'block', 'Sensitive records enter the feature without an approved data flow.', 'Remove sensitive fields or document and obtain approval for their use before release.'],
        ['unknown', 'Data use is unverified', 'review', 'The model inputs or retained logs have not been reviewed.', 'Trace the data from input through the model and logs.']
      ]
    },
    {
      id: 'instructions',
      title: 'Instruction boundaries',
      prompt: 'Can outside messages change the assistant’s rules or permissions?',
      evidence: 'Review which component owns the instructions and which controls restrict permissions when outside content is processed.',
      choices: [
        ['separate', 'Outside messages stay separate from system rules', 'pass', 'Trusted instructions and permitted actions are managed separately from outside messages.', 'Recheck permissions when adding a new input or action.'],
        ['override', 'Outside messages can change rules or permissions', 'block', 'Untrusted content can change rules or permissions meant to control the feature.', 'Keep trusted settings separate and enforce permission checks outside the model.'],
        ['unknown', 'Separation is unverified', 'review', 'The handling of outside messages has not been verified.', 'Review how outside messages reach the model and where permissions are enforced.']
      ]
    },
    {
      id: 'outputs',
      title: 'Output review',
      prompt: 'Have people reviewed the assistant’s replies against specific expectations?',
      evidence: 'Keep sample inputs, expected replies, actual results, and outcomes for incorrect, uncertain, and unusual cases.',
      choices: [
        ['met', 'Documented checks met expectations', 'pass', 'The recorded review found that the tested replies met expectations.', 'Repeat the checks after changes to instructions, data, or the model.'],
        ['failed', 'A required behavior failed review', 'block', 'A required reply behavior failed a documented check.', 'Fix the failed behavior and record the result of a fresh test.'],
        ['unknown', 'Evidence is missing or incomplete', 'review', 'There are not enough reviewed examples to support a release decision.', 'Review representative replies and record how each compares with the expected behavior.']
      ]
    },
    {
      id: 'approval',
      title: 'Human approval',
      prompt: 'What happens before the assistant sends a message or changes a record?',
      evidence: 'Use a fictional example to confirm a reviewer can inspect, approve, or decline an action before it takes effect.',
      choices: [
        ['automatic', 'The assistant can act on its own', 'block', 'A consequential action can happen before anyone reviews it.', 'Require explicit approval that the sending or writing service enforces.'],
        ['required', 'A reviewer must approve the specific action', 'pass', 'The recorded workflow requires human approval before execution.', 'Confirm that declining approval stops the action.'],
        ['drafts', 'Drafts only, with no send or write capability', 'not_applicable', 'The assistant can draft a reply but cannot send it or change a record.', 'Revisit this check before adding a send or write capability.'],
        ['unknown', 'Approval behavior is unverified', 'review', 'It is unclear which actions the assistant can trigger.', 'List those actions and verify that the service enforces approval.']
      ]
    },
    {
      id: 'spending',
      title: 'API spending controls',
      prompt: 'What limits usage of paid APIs?',
      evidence: 'Confirm request limits and a spending limit that stops or throttles use when the threshold is reached.',
      choices: [
        ['alerts', 'Alerts only or no enforced limits', 'block', 'Alerts can warn that costs are rising while paid requests continue.', 'Enforce request limits and a spending cutoff at the provider or in your service.'],
        ['enforced', 'Request limits and a spending limit are enforced', 'pass', 'The recorded configuration limits request volume and spending.', 'Confirm the enforcement behavior and review the limits as usage changes.'],
        ['none', 'This feature uses no paid APIs', 'not_applicable', 'The feature does not generate metered API charges.', 'Revisit this check before connecting a paid service.'],
        ['unknown', 'Limits are unverified', 'review', 'Spending and request limits have not been confirmed.', 'Verify which APIs are metered and confirm how their limits are enforced.']
      ]
    },
    {
      id: 'artifacts',
      title: 'Published files',
      prompt: 'Which files will the deployment publish?',
      evidence: 'Compare the exact deployment package with the approved public file list and record the scan of that package.',
      choices: [
        ['checked', 'The package was checked against the public file list', 'pass', 'The recorded review covers the package intended for publication.', 'Repeat the package check for each release.'],
        ['private', 'The package contains private or unapproved files', 'block', 'The package includes files that were not approved for publication.', 'Remove those files and rebuild, then check the exact rebuilt package.'],
        ['unknown', 'The package has not been reviewed', 'review', 'There is no confirmation of what visitors will be able to download.', 'List and inspect the exact package before deployment.']
      ]
    }
  ];

  const checks = checkDefinitions.map(({choices, ...check}) => ({
    ...check,
    options: choices.map(([value, label]) => ({value, label}))
  }));

  const scenarios = {
    sample: {
      credentials: 'browser', data: 'fictional', instructions: 'unknown', outputs: 'unknown',
      approval: 'automatic', spending: 'alerts', artifacts: 'unknown'
    },
    revised: {
      credentials: 'server', data: 'fictional', instructions: 'separate', outputs: 'met',
      approval: 'required', spending: 'enforced', artifacts: 'checked'
    },
    blank: Object.fromEntries(checks.map(({id}) => [id, 'unknown']))
  };

  function evaluate(answers) {
    const counts = {block: 0, review: 0, pass: 0, not_applicable: 0};
    const rows = checkDefinitions.map(({id, choices}) => {
      const answer = answers && Object.hasOwn(answers, id) ? answers[id] : 'unknown';
      const [, , state, reason, nextStep] = choices.find(([value]) => value === answer) ??
        choices.find(([value]) => value === 'unknown');
      counts[state] += 1;
      return {id, state, reason, nextStep};
    });

    let decision = 'signoff';
    if (counts.block) decision = 'hold';
    else if (counts.review) decision = 'review';
    return {decision, counts, rows};
  }

  const rules = {checks, scenarios, evaluate};
  if (typeof window !== 'undefined') window.AIReleaseRules = rules;
  if (typeof module !== 'undefined' && module.exports) module.exports = rules;
})();
