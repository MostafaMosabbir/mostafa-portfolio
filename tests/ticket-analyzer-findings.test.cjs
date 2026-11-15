const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const caseDirectory = "projects/ticket-analyzer";
const read = file => readFileSync(path.join(root, file), "utf8");

function findings(file) {
  const match = read(file).match(/<!-- Project 003 sample begins -->([\s\S]*?)<!-- Project 003 sample ends -->/);
  assert.ok(match, `Missing Project 003 findings in ${file}`);
  return match[1].split(/\r?\n/).map(line => line.trim()).filter(Boolean).join("\n");
}

test("the Workbench and the case file display identical Project 003 findings", () => {
  assert.equal(findings("index.html"), findings(`${caseDirectory}/index.html`));
});

test("the Project 003 findings agree with the generated Python sample report", () => {
  const report = read(`${caseDirectory}/sample-findings.md`);
  const markup = findings("index.html");
  const accepted = report.match(/Valid tickets analyzed: (\d+)/)[1];
  const completed = report.match(/Resolved or closed tickets: (\d+)/)[1];
  const missing = report.match(/No resolution note: (\d+)/)[1];
  const incomplete = report.match(/Missing a heading or section text: (\d+)/)[1];
  const populated = report.match(/All three sections contain text: (\d+)/)[1];
  assert.ok(markup.includes(`accepted ${accepted} fictional tickets`));
  assert.ok(markup.includes(`${completed} resolved or closed tickets, ${Number(missing) + Number(incomplete)} needed documentation review`));
  const counts = [...markup.matchAll(/<dt>[^<]+<\/dt><dd>(\d+)<\/dd>/g)].map(match => match[1]);
  assert.deepEqual(counts, [missing, incomplete, populated]);

  const ticket = markup.match(/data-analyzer-ticket="([^"]+)"/)[1];
  const result = report.split(/\r?\n/).find(line => line.startsWith(`- ${ticket}:`));
  assert.ok(result, `Expected ${ticket} in the report's missing headings`);
  const labels = [...markup.matchAll(/<code>(\w+):<\/code>/g)].map(match => match[1]);
  assert.equal(result, `- ${ticket}: ${labels.join(", ")}`);
});
