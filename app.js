/* Breathe-Easy Returns & Issues
 * Stats-first dashboard for technician-caused issues / returns.
 * Design: warm conversion palette + clear performance structure.
 * Data: data.json (from Clean_Data)
 */
const TECH_ORDER = ['Matthew', 'Tiago', 'Nick', 'Alun', 'Iggi', 'Josh'];
const TECH_COLORS = {
  Matthew: '#1481c3',
  Tiago: '#59bcee',
  Nick: '#16a34a',
  Alun: '#7c5cbf',
  Iggi: '#fb8e28',
  Josh: '#8A8178'
};

let DATA = null;
let rangeStart = null;
let rangeEnd = null;
let activeRoute = 'team';

function $(id) { return document.getElementById(id); }
function fmt(n, d = 0) {
  if (n == null || isNaN(n)) return '\u2014';
  return Number(n).toLocaleString('en-HK', { maximumFractionDigits: d, minimumFractionDigits: d });
}
function fmtMoney(n) {
  if (n == null || isNaN(n)) return '\u2014';
  return '$' + Number(n).toLocaleString('en-HK', { maximumFractionDigits: 0 });
}

async function loadData() {
  const res = await fetch('data.json');
  DATA = await res.json();
}

function inRange(rec) {
  // No date bounds \u2192 include everything (even undated rows)
  if (!rangeStart && !rangeEnd) return true;
  if (!rec.created) return false;
  if (rangeStart && rec.created < rangeStart) return false;
  if (rangeEnd && rec.created > rangeEnd) return false;
  return true;
}

function filtered(tech = null) {
  let list = DATA.records.filter(inRange);
  if (tech) list = list.filter(r => r.technician === tech);
  return list;
}

function setRange(start, end, activeBtn) {
  rangeStart = start || null;
  rangeEnd = end || null;
  document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
  if (activeBtn) $(activeBtn)?.classList.add('active');
  if (start) $('dateStart').value = start;
  else if (start === null) $('dateStart').value = DATA.date_min || '';
  if (end) $('dateEnd').value = end;
  else if (end === null) $('dateEnd').value = DATA.date_max || '';
  render();
}

function applyCustomDates() {
  const s = $('dateStart').value || null;
  const e = $('dateEnd').value || null;
  setRange(s, e, null);
}

function presetAll() {
  setRange(null, null, 'btnAll');
  $('dateStart').value = DATA.date_min || '';
  $('dateEnd').value = DATA.date_max || '';
}
function preset90() {
  const end = DATA.date_max || new Date().toISOString().slice(0, 10);
  const d = new Date(end + 'T12:00:00');
  d.setDate(d.getDate() - 90);
  setRange(d.toISOString().slice(0, 10), end, 'btn90');
}
function presetYTD() {
  const end = DATA.date_max || '2026-12-31';
  setRange('2026-01-01', end, 'btnYTD');
}

/* ---------- Routing ---------- */
function setNav(route) {
  activeRoute = route;
  const crew = [
    { id: 'team', label: 'Full Team' },
    ...TECH_ORDER.filter(t => DATA.technicians.includes(t)).map(t => ({ id: 'tech:' + t, label: t }))
  ];
  $('nav-links').innerHTML = crew.map(c => {
    const active = route === c.id ? ' active' : '';
    return `<button class="nav-btn${active}" data-route="${c.id}">${c.label}</button>`;
  }).join('');
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      const r = btn.dataset.route;
      location.hash = r === 'team' ? '#/team' : `#/tech/${r.split(':')[1]}`;
    };
  });
}

function parseRoute() {
  const h = (location.hash || '#/team').replace(/^#\/?/, '');
  if (h.startsWith('tech/')) {
    const name = h.slice(5);
    if (TECH_ORDER.includes(name)) return 'tech:' + name;
  }
  return 'team';
}

function onRoute() {
  const route = parseRoute();
  setNav(route);
  render();
  window.scrollTo(0, 0);
}

/* ---------- Render ---------- */
function render() {
  const route = parseRoute();
  activeRoute = route;
  if (route === 'team') renderTeam();
  else if (route.startsWith('tech:')) renderTech(route.split(':')[1]);
}

function renderKPIs(list, el) {
  const total = list.length;
  const fault = list.filter(r => r.is_fault).length;
  const cost = list.reduce((s, r) => s + (r.upfront_cost || 0), 0);
  const opp = list.reduce((s, r) => s + (r.opportunity_cost || 0), 0);
  const cats = new Set(list.map(r => r.category)).size;

  el.innerHTML = `
    <div class="kpi accent"><div class="label">Issues</div><div class="value">${fmt(total)}</div></div>
    <div class="kpi danger"><div class="label">Fault</div><div class="value">${fmt(fault)}</div><div class="sub">${total ? fmt(fault / total * 100, 0) + '% of issues' : ''}</div></div>
    <div class="kpi warm"><div class="label">Upfront Cost</div><div class="value">${fmtMoney(cost)}</div></div>
    <div class="kpi teal"><div class="label">Opp. Cost</div><div class="value">${fmtMoney(opp)}</div></div>
    <div class="kpi blue"><div class="label">Categories</div><div class="value">${fmt(cats)}</div></div>
  `;
}

function renderContribution(list, el) {
  const by = {};
  TECH_ORDER.forEach(t => { by[t] = { n: 0, cost: 0 }; });
  list.forEach(r => {
    if (!by[r.technician]) by[r.technician] = { n: 0, cost: 0 };
    by[r.technician].n++;
    by[r.technician].cost += r.upfront_cost || 0;
  });
  const max = Math.max(1, ...Object.values(by).map(x => x.n));
  const sorted = TECH_ORDER.filter(t => by[t] && by[t].n > 0)
    .sort((a, b) => by[b].n - by[a].n);

  el.innerHTML = sorted.map(t => {
    const pct = (by[t].n / max * 100).toFixed(1);
    return `
      <div class="contrib-row">
        <div class="contrib-name t-${t}">${t}</div>
        <div class="contrib-bar-track"><div class="contrib-bar-fill bar-${t}" style="width:${pct}%"></div></div>
        <div class="contrib-count">${fmt(by[t].n)}</div>
        <div class="contrib-cost">${fmtMoney(by[t].cost)}</div>
      </div>`;
  }).join('') || '<div class="empty">No issues in this range</div>';
}

function renderCategories(list, el) {
  const counts = {};
  list.forEach(r => {
    const c = r.category || 'Unknown';
    counts[c] = (counts[c] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  el.innerHTML = sorted.map(([name, n]) => `
    <div class="cat-chip">
      <span class="cat-name">${name}</span>
      <span class="cat-count">${n}</span>
    </div>`).join('') || '<div class="empty">No data</div>';
}

function renderTypeTable(list, el) {
  const counts = {};
  list.forEach(r => {
    const t = r.type || 'Unknown';
    counts[t] = (counts[t] || 0) + 1;
  });
  const total = list.length || 1;
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<tr><td>${t}</td><td>${fmt(n)}</td><td>${fmt(n / total * 100, 1)}%</td></tr>`)
    .join('');
  el.innerHTML = `
    <table>
      <thead><tr><th>Type</th><th>Count</th><th>Share</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="3">No data</td></tr>'}</tbody>
    </table>`;
}

function renderIssueTable(list, el, limit = 80) {
  const slice = list.slice().sort((a, b) => (b.created || '').localeCompare(a.created || '')).slice(0, limit);
  if (!slice.length) {
    el.innerHTML = '<div class="empty">No issues in this date range</div>';
    return;
  }
  const rows = slice.map(r => {
    const badge = r.is_fault
      ? '<span class="badge fault">Fault</span>'
      : (r.type && r.type.includes('No Fault')
        ? '<span class="badge nofault">No Fault</span>'
        : '<span class="badge unknown">\u2014</span>');
    return `<tr>
      <td>${r.created || '\u2014'}</td>
      <td class="t-${r.technician}">${r.technician}</td>
      <td>${r.category || '\u2014'}</td>
      <td>${badge}</td>
      <td>${fmtMoney(r.upfront_cost)}</td>
      <td style="text-align:left;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.description || '').replace(/"/g, '"')}">${r.description || '\u2014'}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `
    <table>
      <thead><tr>
        <th>Created</th><th>Tech</th><th>Category</th><th>Fault</th><th>Cost</th><th>Note</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${list.length > limit ? `<div class="note">Showing latest ${limit} of ${list.length} issues in range.</div>` : ''}`;
}

function renderTimeline(list, elId) {
  const buckets = {};
  list.forEach(r => {
    if (!r.created) return;
    const m = r.created.slice(0, 7);
    if (!buckets[m]) buckets[m] = { total: 0, fault: 0, cost: 0 };
    buckets[m].total++;
    if (r.is_fault) buckets[m].fault++;
    buckets[m].cost += r.upfront_cost || 0;
  });
  const months = Object.keys(buckets).sort();
  if (!months.length) {
    $(elId).innerHTML = '';
    return;
  }
  const totals = months.map(m => buckets[m].total);
  const faults = months.map(m => buckets[m].fault);
  const labels = months.map(m => {
    const [y, mo] = m.split('-');
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo - 1] + ' ' + y.slice(2);
  });

  Plotly.newPlot(elId, [
    {
      x: labels, y: totals, name: 'All issues',
      type: 'bar', marker: { color: '#FF7A45', opacity: 0.85 },
      hovertemplate: '%{x}<br>%{y} issues<extra></extra>'
    },
    {
      x: labels, y: faults, name: 'Fault',
      type: 'bar', marker: { color: '#C45C4A', opacity: 0.9 },
      hovertemplate: '%{x}<br>%{y} fault<extra></extra>'
    }
  ], {
    barmode: 'group',
    margin: { t: 12, r: 12, b: 48, l: 40 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: 'Nunito, sans-serif', size: 12, color: '#2D2A26' },
    legend: { orientation: 'h', y: 1.12, x: 0 },
    xaxis: { tickangle: -30, gridcolor: '#EDE4DA' },
    yaxis: { gridcolor: '#EDE4DA', zeroline: false, title: '' },
    bargap: 0.25
  }, { responsive: true, displayModeBar: false });
}

function renderCategoryPie(list, elId) {
  const counts = {};
  list.forEach(r => {
    const c = r.category || 'Unknown';
    counts[c] = (counts[c] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    $(elId).innerHTML = '';
    return;
  }
  const palette = ['#FF7A45', '#4ECDC4', '#6B9AC4', '#9B8AA6', '#F4A261', '#7BA38A', '#C45C4A', '#E8A87C', '#85CDCA', '#D4A5A5'];
  Plotly.newPlot(elId, [{
    labels: entries.map(e => e[0]),
    values: entries.map(e => e[1]),
    type: 'pie',
    hole: 0.55,
    marker: { colors: palette },
    textinfo: 'label+value',
    textposition: 'outside',
    automargin: true,
    hovertemplate: '%{label}<br>%{value} (%{percent})<extra></extra>'
  }], {
    margin: { t: 20, r: 20, b: 20, l: 20 },
    paper_bgcolor: 'transparent',
    font: { family: 'Nunito, sans-serif', size: 12, color: '#2D2A26' },
    showlegend: false
  }, { responsive: true, displayModeBar: false });
}

function renderTeam() {
  const list = filtered();
  $('page-title').textContent = 'Full Team';
  $('page-sub').textContent = 'All technician issues & returns \u00b7 aggregate view';

  renderKPIs(list, $('kpi-row'));
  renderContribution(list, $('contrib-list'));
  renderCategories(list, $('cat-grid'));
  renderTypeTable(list, $('type-table'));
  renderIssueTable(list, $('issue-table'), 60);
  renderTimeline(list, 'timeline-chart');
  renderCategoryPie(list, 'cat-pie');

  $('team-only').style.display = '';
  $('tech-only').style.display = 'none';
}

function renderTech(name) {
  const list = filtered(name);
  $('page-title').textContent = name;
  $('page-sub').textContent = `Personal issues & returns \u00b7 ${name}`;

  renderKPIs(list, $('kpi-row'));
  renderCategories(list, $('cat-grid'));
  renderTypeTable(list, $('type-table'));
  renderIssueTable(list, $('issue-table'), 100);
  renderTimeline(list, 'timeline-chart');
  renderCategoryPie(list, 'cat-pie');

  $('team-only').style.display = 'none';
  $('tech-only').style.display = '';
  $('tech-name-label').textContent = name;
}

/* ---------- Boot ---------- */
async function startDashboard() {
  await loadData();
  rangeStart = null;
  rangeEnd = null;
  $('dateStart').value = DATA.date_min || '';
  $('dateEnd').value = DATA.date_max || '';
  $('btnAll').classList.add('active');

  $('btnAll').onclick = presetAll;
  $('btn90').onclick = preset90;
  $('btnYTD').onclick = presetYTD;
  $('btnApply').onclick = applyCustomDates;

  window.addEventListener('hashchange', onRoute);
  onRoute();

  $('app-root').style.display = 'block';
  $('auth-gate').style.display = 'none';
}

window.startDashboard = startDashboard;
