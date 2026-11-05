/* Render the fictional R-generated summary without fetching data or
   inserting source text as HTML. Buttons work with mouse and keyboard. */
(() => {
  "use strict";

  // The data is generated from a fixed fictional crosswalk and gap report.
  // Validate it before replacing the readable no-JavaScript fallback.
  function validate(data) {
    if (!data || data.schema_version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data.as_of) || !Array.isArray(data.domains) || data.domains.length !== 6 || !data.totals) return false;
    const names = ["Govern", "Identify", "Protect", "Detect", "Respond", "Recover"];
    let supported = 0, needs = 0;
    for (let i = 0; i < names.length; i++) {
      const row = data.domains[i];
      if (!row || row.domain !== names[i] || !Number.isSafeInteger(row.supported_draft) || row.supported_draft < 0 || !Number.isSafeInteger(row.needs_work) || row.needs_work < 0 || row.total !== row.supported_draft + row.needs_work) return false;
      if (row.example && (typeof row.example.id !== "string" || typeof row.example.requirement !== "string" || !Array.isArray(row.example.gaps) || !row.example.gaps.every(gap => typeof gap === "string"))) return false;
      supported += row.supported_draft; needs += row.needs_work;
    }
    return data.totals.supported_draft === supported && data.totals.needs_work === needs && data.totals.requirements === supported + needs;
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { validate };
  if (typeof document === "undefined") return;

  const mount = document.getElementById("security-findings-chart");
  const data = window.SECURITY_FINDINGS_DATA;
  if (!mount || !validate(data)) return;
  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  const wrapper = element("section", "security-findings");
  wrapper.setAttribute("aria-label", "Fictional assessment findings");
  wrapper.append(element("p", "sf-meta", `Fictional assessment as of ${data.as_of} · Selected NIST CSF 2.0 mappings`));
  const stats = element("div", "sf-stats");
  for (const [value, label] of [[data.totals.requirements, "Selected requirements"], [data.totals.supported_draft, "Supported drafts"], [data.totals.needs_work, "Need work"]]) {
    const stat = element("div", "sf-stat");
    stat.append(element("strong", "", String(value)), element("span", "", label)); stats.append(stat);
  }
  wrapper.append(stats);
  const grid = element("div", "sf-grid"), chart = element("div", "sf-chart"), detail = element("div", "sf-detail");
  chart.append(element("h4", "", "Explore the findings"), element("p", "sf-note", "Select a function to inspect a fictional finding."));
  const legend = element("div", "sf-legend");
  for (const [label, className] of [["Supported draft", "sf-dot"], ["Needs work", "sf-dot sf-warn"]]) {
    const item = element("span", ""), dot = element("i", className); dot.setAttribute("aria-hidden", "true"); item.append(dot, document.createTextNode(label)); legend.append(item);
  }
  chart.append(legend);
  const rows = element("div", "sf-rows"); rows.setAttribute("role", "group"); rows.setAttribute("aria-label", "NIST CSF functions");
  const scale = Math.max(1, ...data.domains.map(row => row.total));
  const buttons = [];
  detail.setAttribute("aria-live", "polite"); detail.setAttribute("aria-atomic", "true");
  function select(row) {
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.domain === row.domain));
    detail.replaceChildren();
    detail.append(element("p", "sf-detail-label", "Selected function"), element("h4", "", row.domain));
    detail.append(element("p", "sf-note", `${row.total} selected · ${row.supported_draft} supported drafts · ${row.needs_work} need work`));
    if (!row.example) { detail.append(element("p", "sf-note", "No example gap is recorded for this function.")); return; }
    detail.append(element("p", "sf-detail-label", "Example finding · fictional"));
    detail.append(element("strong", "", row.example.id), element("p", "", row.example.requirement));
    const list = element("ul", "");
    for (const gap of row.example.gaps) list.append(element("li", "", gap));
    detail.append(list);
  }
  for (const row of data.domains) {
    const button = element("button", "sf-row"); button.type = "button"; button.dataset.domain = row.domain;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `${row.domain}: ${row.supported_draft} supported drafts, ${row.needs_work} need work`);
    const track = element("span", "sf-track"); track.setAttribute("aria-hidden", "true");
    const supported = element("span", "sf-supported"), needs = element("span", "sf-needs");
    supported.style.width = `${100 * row.supported_draft / scale}%`; needs.style.width = `${100 * row.needs_work / scale}%`;
    track.append(supported, needs);
    button.append(element("span", "", row.domain), track, element("span", "sf-numbers", `${row.supported_draft} / ${row.needs_work}`));
    button.addEventListener("click", () => select(row)); buttons.push(button); rows.append(button);
  }
  chart.append(rows, element("p", "sf-note", `Counts: supported drafts / need work. Bar scale: 0 to ${scale} selected requirements.`));
  grid.append(chart, detail); wrapper.append(grid);
  wrapper.append(element("p", "sf-limit", "Selected project-defined requirements only. The counts are not compliance scores. Evidence files were not inspected; supported drafts still require human review."));
  const source = element("p", "sf-note");
  source.append(document.createTextNode("Summarized with R from the fictional crosswalk and gap report. "));
  const link = element("a", "", "View the R analysis ↗");
  link.href = "https://github.com/MostafaMosabbir/mostafa-portfolio/blob/main/cybersecurity/security-proposal-workspace/analysis/summarize_findings.R";
  source.append(link); wrapper.append(source);
  mount.replaceChildren(wrapper);
  select(data.domains.find(row => row.domain === "Protect") || data.domains[0]);
})();
