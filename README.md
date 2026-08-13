# Breathe-Easy · Returns & Issues

Stats-first dashboard for technician-caused issues and return visits.

**Design:** warm conversion palette (cream / coral / Nunito) + clear performance-dashboard structure (crew nav, personal pages, aggregate view).

**Live:** https://mydomshurt.github.io/breathe-easy-returns/

## Pages
- **Full Team** — aggregate KPIs, contribution ranking, category & type breakdown, timeline, issue log
- **Technician** — Matthew · Tiago · Nick · Alun · Iggi · Josh — personal KPIs and issue mix

## Features
- Date range filter (custom / all time / last 90 days / 2026 YTD)
- Primary metrics: Issues, Fault count, Upfront cost, Opportunity cost, Categories
- Contribution bars by technician
- Category chips + type table
- Monthly timeline (Plotly) and category pie
- Issue log (phones removed)

## Data
`data.json` generated from `Technicians_Returns_Clean.xlsx` (205 records).

## Stack
Static SPA · Nunito · Plotly · no backend yet (Firebase auth gate can be wired like conversion dashboard).

## Local
```bash
cd breathe-easy-returns
python3 -m http.server 8765
# open http://127.0.0.1:8765
```
