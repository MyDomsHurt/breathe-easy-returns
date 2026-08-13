/* Breathe-Easy Returns & Issues — v5 brand navy/sky + period date module */
const TECH_ORDER = ['Matthew', 'Tiago', 'Nick', 'Alun', 'Iggi', 'Josh'];
const TECH_COLORS = { Matthew: '#2563eb', Tiago: '#0ea5e9', Nick: '#22c55e', Alun: '#a855f7', Iggi: '#f97316', Josh: '#8aa0b8' };

let DATA = null, rangeStart = null, rangeEnd = null, activeRoute = 'team';

function $(id) { return document.getElementById(id); }
function fmt(n, d = 0) {
  if (n == null || isNaN(n)) return '\u2014';
  return Number(n).toLocaleString('en-HK', { maximumFractionDigits: d, minimumFractionDigits: d });
}
function fmtMoney(n) {
  if (n == null || isNaN(n)) return '\u2014';
  return '$' + Number(n).toLocaleString('en-HK', { maximumFractionDigits: 0 });
}

async function gunzipB64(b64) {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bin]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return JSON.parse(new TextDecoder().decode(buf));
}

async function loadData() {
  const res = await fetch('data.json');
  DATA = await res.json();
  if (!DATA.records) DATA.records = [];
  try {
    const [a, b] = await Promise.all([
      fetch('data-records-a.b64').then(r => r.ok ? r.text() : ''),
      fetch('data-records-b.b64').then(r => r.ok ? r.text() : '')
    ]);
    if (a && b) {
      const records = await gunzipB64((a + b).trim());
      if (Array.isArray(records) && records.length) DATA.records = records;
    }
  } catch (e) { console.warn('records load', e); }
  if (!DATA.records.length) {
    try {
      const res2 = await fetch('data-records.json');
      if (res2.ok) {
        const extra = await res2.json();
        if (extra.records && extra.records.length) DATA.records = extra.records;
      }
    } catch (e) {}
  }
}

function inRange(rec) {
  if (!rangeStart && !rangeEnd) return true;
  if (!rec.created) return false;
  if (rangeStart && rec.created < rangeStart) return false;
  if (rangeEnd && rec.created > rangeEnd) return false;
  return true;
}
function filtered(tech = null) {
  let list = (DATA.records || []).filter(inRange);
  if (tech) list = list.filter(r => r.technician === tech);
  return list;
}
function hasRecords() { return (DATA.records || []).length > 0; }

function clearDateActive() {
  document.querySelectorAll('.period-btn, .month-btn').forEach(b => b.classList.remove('active'));
}
function setRange(start, end, activeId) {
  rangeStart = start || null;
  rangeEnd = end || null;
  clearDateActive();
  if (activeId) $(activeId)?.classList.add('active');
  if ($('dateStart')) {
    $('dateStart').value = start || DATA.date_min || '';
    $('dateEnd').value = end || DATA.date_max || '';
  }
  updateDateDesc();
  render();
}
function updateDateDesc() {
  const el = $('date-desc');
  if (!el) return;
  if (!rangeStart && !rangeEnd) {
    el.textContent = 'All issues · ' + (DATA.date_min || '?') + ' → ' + (DATA.date_max || '?');
  } else {
    el.textContent = 'Showing ' + (rangeStart || '…') + ' → ' + (rangeEnd || '…');
  }
}
function lastDayOfMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 0);
  return d.toISOString().slice(0, 10);
}
function applyCustomDates() {
  const s = $('dateStart').value || null;
  const e = $('dateEnd').value || null;
  setRange(s, e, 'btnCustom');
  $('custom-row').hidden = false;
}
function presetAll() {
  $('custom-row').hidden = true;
  setRange(null, null, 'btnAll');
}
function presetDays(n, btnId) {
  $('custom-row').hidden = true;
  const end = DATA.date_max || new Date().toISOString().slice(0, 10);
  const d = new Date(end + 'T12:00:00');
  d.setDate(d.getDate() - n);
  setRange(d.toISOString().slice(0, 10), end, btnId);
}
function presetYTD() {
  $('custom-row').hidden = true;
  setRange('2026-01-01', DATA.date_max || '2026-12-31', 'btnYTD');
}
function presetMonth(ym) {
  $('custom-row').hidden = true;
  setRange(ym + '-01', lastDayOfMonth(ym), 'm-' + ym);
}
function toggleCustom() {
  const row = $('custom-row');
  const open = row.hidden;
  row.hidden = !open;
  clearDateActive();
  $('btnCustom').classList.add('active');
  if (open) {
    $('dateStart').value = rangeStart || DATA.date_min || '';
    $('dateEnd').value = rangeEnd || DATA.date_max || '';
  }
}
function buildMonthChips() {
  const row = $('month-row');
  if (!row) return;
  const months = new Set();
  (DATA.records || []).forEach(r => {
    if (r.created && r.created.length >= 7) months.add(r.created.slice(0, 7));
  });
  if (!months.size && DATA.date_min && DATA.date_max) {
    let cur = DATA.date_min.slice(0, 7);
    const end = DATA.date_max.slice(0, 7);
    while (cur <= end) {
      months.add(cur);
      const [y, m] = cur.split('-').map(Number);
      const nm = m === 12 ? 1 : m + 1;
      const ny = m === 12 ? y + 1 : y;
      cur = ny + '-' + String(nm).padStart(2, '0');
    }
  }
  const labels = { '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun',
                   '07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec' };
  const sorted = [...months].sort();
  row.innerHTML = sorted.map(ym => {
    const [y, m] = ym.split('-');
    const short = labels[m] + (y === '2025' ? " '25" : (y === '2026' ? '' : ' ' + y.slice(2)));
    return `<button type="button" class="month-btn" id="m-${ym}" data-month="${ym}">${short}</button>`;
  }).join('');
  row.querySelectorAll('.month-btn').forEach(btn => {
    btn.onclick = () => presetMonth(btn.dataset.month);
  });
}

function setNav(route) {
  activeRoute = route;
  const crew = [
    { id: 'team', label: 'Full Team' },
    ...TECH_ORDER.filter(t => (DATA.technicians || []).includes(t)).map(t => ({ id: 'tech:' + t, label: t }))
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
function onRoute() { setNav(parseRoute()); render(); window.scrollTo(0, 0); }
function render() {
  const route = parseRoute();
  activeRoute = route;
  if (route === 'team') renderTeam();
  else if (route.startsWith('tech:')) renderTech(route.split(':')[1]);
}

function renderKPIsFromSummary(tech) {
  if (tech && DATA.by_tech && DATA.by_tech[tech]) {
    const s = DATA.by_tech[tech];
    return { total: s.total, fault: s.fault, cost: s.upfront_cost, opp: s.opportunity_cost || 0, cats: Object.keys(s.categories || {}).length };
  }
  return { total: DATA.total || 0, fault: DATA.fault || 0, cost: DATA.upfront_cost || 0, opp: DATA.opportunity_cost || 0, cats: Object.keys(DATA.categories || {}).length };
}
function renderKPIs(list, el, tech) {
  let total, fault, cost, opp, cats;
  if (hasRecords()) {
    total = list.length;
    fault = list.filter(r => r.is_fault).length;
    cost = list.reduce((s, r) => s + (r.upfront_cost || 0), 0);
    opp = list.reduce((s, r) => s + (r.opportunity_cost || 0), 0);
    cats = new Set(list.map(r => r.category)).size;
  } else {
    const s = renderKPIsFromSummary(tech);
    total = s.total; fault = s.fault; cost = s.cost; opp = s.opp; cats = s.cats;
  }
  el.innerHTML = `
    <div class="kpi accent"><div class="label">Issues</div><div class="value">${fmt(total)}</div></div>
    <div class="kpi danger"><div class="label">Fault</div><div class="value">${fmt(fault)}</div><div class="sub">${total ? fmt(fault / total * 100, 0) + '% of issues' : ''}</div></div>
    <div class="kpi warm"><div class="label">Upfront Cost</div><div class="value">${fmtMoney(cost)}</div></div>
    <div class="kpi teal"><div class="label">Opp. Cost</div><div class="value">${fmtMoney(opp)}</div></div>
    <div class="kpi blue"><div class="label">Categories</div><div class="value">${fmt(cats)}</div></div>`;
}

function renderContribution(list, el) {
  const by = {};
  TECH_ORDER.forEach(t => { by[t] = { n: 0, cost: 0 }; });
  if (hasRecords()) {
    list.forEach(r => {
      if (!by[r.technician]) by[r.technician] = { n: 0, cost: 0 };
      by[r.technician].n++;
      by[r.technician].cost += r.upfront_cost || 0;
    });
  } else if (DATA.by_tech) {
    Object.entries(DATA.by_tech).forEach(([t, s]) => { by[t] = { n: s.total || 0, cost: s.upfront_cost || 0 }; });
  }
  const max = Math.max(1, ...Object.values(by).map(x => x.n));
  const sorted = TECH_ORDER.filter(t => by[t] && by[t].n > 0).sort((a, b) => by[b].n - by[a].n);
  el.innerHTML = sorted.map(t => {
    const pct = (by[t].n / max * 100).toFixed(1);
    return `<div class="contrib-row">
      <div class="contrib-name t-${t}">${t}</div>
      <div class="contrib-bar-track"><div class="contrib-bar-fill bar-${t}" style="width:${pct}%"></div></div>
      <div class="contrib-count">${fmt(by[t].n)}</div>
      <div class="contrib-cost">${fmtMoney(by[t].cost)}</div></div>`;
  }).join('') || '<div class="empty">No issues in this range</div>';
}

function renderCategories(list, el, tech) {
  let counts = {};
  if (hasRecords()) list.forEach(r => { const c = r.category || 'Unknown'; counts[c] = (counts[c] || 0) + 1; });
  else if (tech && DATA.by_tech && DATA.by_tech[tech]) counts = DATA.by_tech[tech].categories || {};
  else counts = DATA.categories || {};
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  el.innerHTML = sorted.map(([name, n]) => `<div class="cat-chip"><span class="cat-name">${name}</span><span class="cat-count">${n}</span></div>`).join('') || '<div class="empty">No data</div>';
}

function renderTypeTable(list, el, tech) {
  let counts = {};
  if (hasRecords()) list.forEach(r => { const t = r.type || 'Unknown'; counts[t] = (counts[t] || 0) + 1; });
  else if (tech && DATA.by_tech && DATA.by_tech[tech]) counts = DATA.by_tech[tech].types || {};
  else counts = DATA.types || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<tr><td>${t}</td><td>${fmt(n)}</td><td>${fmt(n / total * 100, 1)}%</td></tr>`).join('');
  el.innerHTML = `<table><thead><tr><th>Type</th><th>Count</th><th>Share</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No data</td></tr>'}</tbody></table>`;
}

function renderIssueTable(list, el, limit = 80) {
  if (!hasRecords()) {
    el.innerHTML = '<div class="empty">Loading issue records\u2026</div>';
    return;
  }
  const slice = list.slice().sort((a, b) => (b.created || '').localeCompare(a.created || '')).slice(0, limit);
  if (!slice.length) { el.innerHTML = '<div class="empty">No issues in this date range</div>'; return; }
  const rows = slice.map(r => {
    const badge = r.is_fault ? '<span class="badge fault">Fault</span>'
      : (r.type && r.type.includes('No Fault') ? '<span class="badge nofault">No Fault</span>' : '<span class="badge unknown">\u2014</span>');
    return `<tr>
      <td>${r.created || '\u2014'}</td>
      <td class="t-${r.technician}">${r.technician}</td>
      <td>${r.category || '\u2014'}</td>
      <td>${badge}</td>
      <td>${fmtMoney(r.upfront_cost)}</td>
      <td style="text-align:left;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.description || '').replace(/"/g, '"')}">${r.description || '\u2014'}</td></tr>`;
  }).join('');
  el.innerHTML = `<table><thead><tr><th>Created</th><th>Tech</th><th>Category</th><th>Fault</th><th>Cost</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>${list.length > limit ? `<div class="note">Showing latest ${limit} of ${list.length} issues in range.</div>` : ''}`;
}

function renderTimeline(list, elId) {
  if (!hasRecords()) {
    $(elId).innerHTML = '<div class="empty" style="padding:40px">Loading timeline\u2026</div>';
    return;
  }
  const buckets = {};
  list.forEach(r => {
    if (!r.created) return;
    const m = r.created.slice(0, 7);
    if (!buckets[m]) buckets[m] = { total: 0, fault: 0 };
    buckets[m].total++;
    if (r.is_fault) buckets[m].fault++;
  });
  const months = Object.keys(buckets).sort();
  if (!months.length) { $(elId).innerHTML = ''; return; }
  const labels = months.map(m => {
    const [y, mo] = m.split('-');
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo - 1] + ' ' + y.slice(2);
  });
  Plotly.newPlot(elId, [
    { x: labels, y: months.map(m => buckets[m].total), name: 'All issues', type: 'bar', marker: { color: '#0082C8', opacity: 0.88 }, hovertemplate: '%{x}<br>%{y} issues<extra></extra>' },
    { x: labels, y: months.map(m => buckets[m].fault), name: 'Fault', type: 'bar', marker: { color: '#dc2626', opacity: 0.88 }, hovertemplate: '%{x}<br>%{y} fault<extra></extra>' }
  ], {
    barmode: 'group', margin: { t: 12, r: 12, b: 48, l: 40 },
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, color: '#0c1a33' },
    legend: { orientation: 'h', y: 1.12, x: 0 },
    xaxis: { tickangle: -30, gridcolor: 'rgba(31,63,136,0.12)' },
    yaxis: { gridcolor: 'rgba(31,63,136,0.12)', zeroline: false }, bargap: 0.25
  }, { responsive: true, displayModeBar: false });
}

function renderCategoryShare(list, elId, tech) {
  let counts = {};
  if (hasRecords()) list.forEach(r => { const c = r.category || 'Unknown'; counts[c] = (counts[c] || 0) + 1; });
  else if (tech && DATA.by_tech && DATA.by_tech[tech]) counts = DATA.by_tech[tech].categories || {};
  else counts = DATA.categories || {};
  const entries = Object.entries(counts).sort((a, b) => a[1] - b[1]);
  if (!entries.length) { $(elId).innerHTML = ''; return; }
  const total = entries.reduce((s, e) => s + e[1], 0) || 1;
  const labels = entries.map(e => e[0]);
  const values = entries.map(e => e[1]);
  const pcts = values.map(v => (v / total * 100));
  const colors = values.map((_, i) => {
    const rank = entries.length - 1 - i;
    if (rank === 0) return '#0082C8';
    if (rank === 1) return '#1aa3e0';
    if (rank === 2) return '#5ec8f0';
    return '#8aa0b8';
  });
  const height = Math.max(280, entries.length * 28 + 40);
  Plotly.newPlot(elId, [{
    y: labels, x: values, type: 'bar', orientation: 'h',
    marker: { color: colors, line: { width: 0 } },
    text: values.map((v, i) => v + '  (' + pcts[i].toFixed(0) + '%)'),
    textposition: 'outside',
    textfont: { family: 'Plus Jakarta Sans, sans-serif', size: 12, color: '#0c1a33' },
    hovertemplate: '<b>%{y}</b><br>%{x} issues (%{customdata:.0f}%)<extra></extra>',
    customdata: pcts, cliponaxis: false
  }], {
    margin: { t: 8, r: 80, b: 24, l: 130 }, height: height,
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    font: { family: 'Plus Jakarta Sans, sans-serif', size: 12, color: '#0c1a33' },
    xaxis: { gridcolor: 'rgba(31,63,136,0.12)', zeroline: false, tickfont: { size: 11, color: '#5a6f8a' } },
    yaxis: { automargin: true, tickfont: { size: 12, color: '#0c1a33' }, categoryorder: 'array', categoryarray: labels },
    bargap: 0.35
  }, { responsive: true, displayModeBar: false });
}

function renderTeam() {
  const list = filtered();
  $('page-title').textContent = 'Full Team';
  $('page-sub').textContent = 'All technician issues & returns \u00b7 aggregate view';
  renderKPIs(list, $('kpi-row'), null);
  renderContribution(list, $('contrib-list'));
  renderCategories(list, $('cat-grid'), null);
  renderTypeTable(list, $('type-table'), null);
  renderIssueTable(list, $('issue-table'), 60);
  renderTimeline(list, 'timeline-chart');
  renderCategoryShare(list, 'cat-pie', null);
  $('team-only').style.display = '';
  $('tech-only').style.display = 'none';
}
function renderTech(name) {
  const list = filtered(name);
  $('page-title').textContent = name;
  $('page-sub').textContent = 'Personal issues & returns \u00b7 ' + name;
  renderKPIs(list, $('kpi-row'), name);
  renderCategories(list, $('cat-grid'), name);
  renderTypeTable(list, $('type-table'), name);
  renderIssueTable(list, $('issue-table'), 100);
  renderTimeline(list, 'timeline-chart');
  renderCategoryShare(list, 'cat-pie', name);
  $('team-only').style.display = 'none';
  $('tech-only').style.display = '';
  $('tech-name-label').textContent = name;
}

async function startDashboard() {
  await loadData();
  rangeStart = null; rangeEnd = null;
  buildMonthChips();
  $('btnAll').onclick = presetAll;
  $('btn30').onclick = () => presetDays(30, 'btn30');
  $('btn90').onclick = () => presetDays(90, 'btn90');
  $('btnYTD').onclick = presetYTD;
  $('btnCustom').onclick = toggleCustom;
  $('btnApply').onclick = applyCustomDates;
  if ($('dateStart')) {
    $('dateStart').value = DATA.date_min || '';
    $('dateEnd').value = DATA.date_max || '';
  }
  $('btnAll').classList.add('active');
  updateDateDesc();
  window.addEventListener('hashchange', onRoute);
  onRoute();
  $('app-root').style.display = 'block';
  $('auth-gate').style.display = 'none';
}
window.startDashboard = startDashboard;
