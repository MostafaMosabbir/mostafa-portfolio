/* R creates a snapshot of CISA's public catalog; the browser displays it
   without running R. */
(() => {
  'use strict';
  const url = 'https://raw.githubusercontent.com/MostafaMosabbir/mostafa-portfolio/main/cybersecurity/security-proposal-workspace/kev/snapshot.json';

  // A failed or malformed update must never replace the last known snapshot.
  function valid(data) {
    if (!data || data.schemaVersion !== 1 || !/^\d{4}\.\d{2}\.\d{2}$/.test(data.catalogVersion) ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(data.catalogReleased) ||
        !Number.isSafeInteger(data.catalogCount) || data.catalogCount < 1 ||
        !Array.isArray(data.months) || data.months.length !== 12) return false;
    const released = new Date(data.catalogReleased);
    if (Number.isNaN(released.getTime()) || released.toISOString().slice(0, 10) !== data.catalogReleased.slice(0, 10)) return false;
    let previous = null, total = 0;
    for (const row of data.months) {
      if (!row || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) || !Number.isSafeInteger(row.count) || row.count < 0) return false;
      const [year, month] = row.month.split('-').map(Number), ordinal = year * 12 + month;
      if (previous !== null && ordinal !== previous + 1) return false;
      previous = ordinal; total += row.count;
    }
    return data.months[11].month === data.catalogReleased.slice(0, 7) && total <= data.catalogCount;
  }
  async function load(fetcher, fallback) {
    const controller = new AbortController();
    let timeout;
    try {
      const deadline = new Promise((_, reject) => { timeout = setTimeout(() => {controller.abort(); reject(new Error('Snapshot timed out'));}, 12000); });
      const response = await Promise.race([fetcher(url, {cache: 'no-store', signal: controller.signal}), deadline]);
      if (!response.ok) throw new Error('Snapshot unavailable');
      const latest = await Promise.race([response.json(), deadline]);
      if (!valid(latest) || (valid(fallback) && Date.parse(latest.catalogReleased) < Date.parse(fallback.catalogReleased))) throw new Error('Invalid or older snapshot');
      return {data: latest, status: 'Loaded the latest available snapshot from GitHub. The source release date is shown below.'};
    } catch (_) {
      return valid(fallback) ? {data: fallback, status: 'The current snapshot was unavailable. Showing the bundled backup; it may be out of date.'} : {data: null, status: 'The data is unavailable. Please try again later.'};
    } finally { clearTimeout(timeout); }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {valid, load};
  if (typeof document === 'undefined') return;
  const mount = document.getElementById('kev-output');
  if (!mount) return;
  const fallback = window.KEV_FALLBACK_DATA;
  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  const status = make('p', 'kev-status', 'Showing the bundled snapshot. The chart checks for an update when visible.');
  status.setAttribute('role', 'status');
  const plot = make('div', 'kev-layout'), chart = make('div', 'kev-plot'), details = make('div', 'kev-details');
  details.setAttribute('aria-live', 'polite'); details.setAttribute('aria-atomic', 'true');
  mount.replaceChildren(status, plot);
  plot.append(chart, details);
  let displayed = null, selectedMonth = null;
  // Comparing the fields used by the chart prevents a successful fetch of an
  // identical snapshot from replacing a button the visitor is interacting with.
  const signature = data => JSON.stringify([data.catalogVersion, data.catalogReleased, data.catalogCount, data.months]);

  function render(data) {
    const focusedMonth = chart.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.month : null;
    chart.replaceChildren(); details.replaceChildren();
    if (!valid(data)) { chart.append(make('p', 'kev-status', 'No valid data is available.')); return; }
    displayed = data;
    chart.append(make('p', 'kev-note', '12 catalog months ending with the release month · select a bar'));
    const scroller = make('div', 'kev-scroll'), bars = make('div', 'kev-bars'), labels = make('div', 'kev-labels');
    bars.setAttribute('role', 'group'); bars.setAttribute('aria-label', 'Select a month of CISA catalog additions');
    labels.setAttribute('aria-hidden', 'true');
    const scale = Math.max(1, ...data.months.map(item => item.count));
    const buttons = [];
    const dateLabel = (row, options) => {
      const [y, m] = row.month.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {...options, timeZone:'UTC'});
    };
    function select(row, current) {
      selectedMonth = row.month;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button === current)));
      details.replaceChildren(make('p', 'kev-eyebrow', 'Selected month'), make('h5', '', dateLabel(row,{month:'long',year:'numeric'})), make('strong', '', String(row.count)), make('p', 'kev-note', 'entries added to the catalog'), make('p', 'kev-note', `Catalog version ${data.catalogVersion} · released ${data.catalogReleased.replace('T',' ').replace('Z',' UTC')}`));
      if (row.month === data.catalogReleased.slice(0,7)) details.append(make('p', 'kev-note', 'This month is incomplete through the catalog release date.'));
    }
    for (const row of data.months) {
      const button = make('button', 'kev-bar'); button.type = 'button';
      button.dataset.month = row.month;
      button.setAttribute('aria-pressed','false');
      button.setAttribute('aria-label', `${dateLabel(row,{month:'long',year:'numeric'})}: ${row.count} catalog additions`);
      const bar = make('span', 'kev-column'); bar.style.height = `${row.count / scale * 100}%`; bar.setAttribute('aria-hidden','true');
      button.append(make('span', 'kev-count', String(row.count)), bar);
      button.addEventListener('click', () => select(row, button)); buttons.push(button); bars.append(button);
      labels.append(make('span', '', dateLabel(row,{month:'short',year:'2-digit'})));
    }
    scroller.append(bars, labels); chart.append(scroller);
    const selectedIndex = data.months.findIndex(row => row.month === selectedMonth);
    const index = selectedIndex >= 0 ? selectedIndex : data.months.length - 1;
    select(data.months[index], buttons[index]);
    // Restore keyboard focus after a genuinely newer snapshot replaces the bars.
    if (focusedMonth) {
      const focusIndex = data.months.findIndex(row => row.month === focusedMonth);
      buttons[focusIndex >= 0 ? focusIndex : index].focus();
    }
  }
  render(fallback);
  let started = false;
  async function refresh() {
    if (started) return;
    started = true; status.textContent = 'Checking the latest public snapshot…';
    const result = await load(window.fetch.bind(window), fallback);
    status.textContent = result.status;
    if (result.data) {
      const age = Date.now() - Date.parse(result.data.catalogReleased);
      if (age > 14 * 86400000) status.textContent += ' The catalog release is over 14 days old; check the source for newer data.';
      if (!displayed || signature(result.data) !== signature(displayed)) render(result.data);
    }
  }
  // A small on-demand fetch avoids slowing the rest of the homepage.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); refresh(); }
    }, {rootMargin:'150px'});
    observer.observe(mount);
  } else refresh();
})();
