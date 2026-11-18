# AI Release Check

This project helps a reviewer decide whether an AI feature is ready for a human release decision. The fictional support assistant starts with an exposed browser credential, automatic sending, and billing alerts without enforcement. The revised sample shows the same feature after those issues and the missing evidence are addressed. **My review** starts with seven unverified checks.

## How the decision works

`release-rules.js` evaluates the recorded answers and returns a status, a reason, and a next step for each check. A blocker means **Hold release**. Missing evidence means **Needs review** when no blockers remain. The strongest result is **Ready for human signoff** once every applicable check is met. An absent capability can make an individual check inapplicable.

`review.js` handles the page, updates the totals as answers change, and exports a text summary. The review runs locally and uses structured choices. A person inspects the actual deployment files, permissions, logs, and test results before choosing an answer.

The [NIST Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) informed the focus on privacy, testing before deployment, and human oversight. This project is a practical release review with seven selected checks.
