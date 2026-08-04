#import "base.typ": *
#import "@preview/lilaq:0.6.0" as lq

#let d = json("input.json")

#set page(
  paper: d.at("paper", default: "a4"),
  flipped: d.at("orientation", default: "portrait") == "landscape",
  margin: (top: 3cm, bottom: 2.5cm, x: 1.5cm),
  header: page-header(d.at("name", default: "Server Report")),
  footer: context [
    #set text(size: 8pt, fill: rgb("#999999"))
    #line(length: 100%, stroke: 0.3pt + rgb("#dddddd"))
    #v(0.3em)
    Confidential Internal Data
    #h(1fr)
    Page #counter(page).display() of #counter(page).final().first()
  ],
)

#let metrics = d.at("metrics", default: ())
#let uptime = d.at("uptime", default: none)
#let charts = d.at("charts", default: none)
#let insights = d.at("insights", default: ())
#let cpu_7d = d.at("cpu_7d", default: ())
#let memory_7d = d.at("memory_7d", default: ())
#let disk_7d = d.at("disk_7d", default: ())

// ── Report heading ───────────────────────────────────────────────────────────
#report-heading(
  d.at("name", default: "Server Report"),
  d.at("report_subtitle", default: "Server-specific performance and metrics"),
)

// ── Server Information ───────────────────────────────────────────────────────
#section-title("Server Information")
#kpi-table((
  (label: "Status",        value: status-pill(d.at("status", default: "unknown"))),
  (label: "Client",        value: if d.at("client_name", default: none) != none { d.client_name } else { "—" }),
  (label: "OS",            value: if d.at("operating_system", default: none) != none { d.operating_system } else { "—" }),
  (label: "CPU Model",     value: if d.at("cpu_model", default: none) != none { d.cpu_model } else { "—" }, note: str(d.at("cpu_cores", default: "—")) + " cores"),
  (label: "Memory",        value: if d.at("ram", default: none) != none { d.ram } else { "—" }),
  (label: "Disk",          value: if d.at("disk", default: none) != none { d.disk } else { "—" }),
))

// ── Metrics Summary ──────────────────────────────────────────────────────────
#if metrics.len() > 0 {
  section-title("Metrics Summary (Last 24 Hours)")
  let cpu_vals = metrics.map(m => m.cpu_usage)
  let mem_vals = metrics.map(m => m.memory_usage)
  let disk_vals = metrics.map(m => m.disk_usage)

  data-table(
    headers: ("Metric", "Min", "Max", "Average"),
    rows: (
      ("CPU Usage",
        pct(calc.min(..cpu_vals)),
        pct(calc.max(..cpu_vals)),
        pct(calc.round(cpu_vals.sum() / cpu_vals.len(), digits: 1))),
      ("Memory Usage",
        pct(calc.min(..mem_vals)),
        pct(calc.max(..mem_vals)),
        pct(calc.round(mem_vals.sum() / mem_vals.len(), digits: 1))),
      ("Disk Usage",
        pct(calc.min(..disk_vals)),
        pct(calc.max(..disk_vals)),
        pct(calc.round(disk_vals.sum() / disk_vals.len(), digits: 1))),
    ),
  )
}

// ── SLA Uptime ───────────────────────────────────────────────────────────────
#if uptime != none {
  v(0.5em)
  section-title("SLA Uptime")
  table(
    columns: (1.2fr, 2.8fr),
    stroke: 0.3pt + border-clr,
    inset: (x: 10pt, y: 8pt),
    align: (left + horizon, left + horizon),
    table.cell(fill: bg-light)[
      #set text(size: 8.5pt, weight: "bold", fill: text-dark)
      Uptime Percentage
    ],
    table.cell()[
      #progress-bar(uptime.uptime_percentage)
    ],
    table.cell(fill: bg-light)[
      #set text(size: 8.5pt, weight: "bold", fill: text-dark)
      Outages
    ],
    table.cell()[
      #set text(size: 9pt, fill: text-dark)
      #str(uptime.at("outage_count", default: 0))
      #let last = uptime.at("last_downtime", default: none)
      #if last != none [
        #h(0.4em)
        #text(size: 8pt, fill: text-muted)[(Last: #last)]
      ]
    ]
  )
}

// ── Charts ───────────────────────────────────────────────────────────────────
#if charts != none and "cpu" in charts {
  v(0.5em)
  section-title("CPU Usage Chart")
  image(bytes(charts.cpu), width: 100%, height: 160pt)
}

// ── Metrics Trends (Last 7 Days) ─────────────────────────────────────────────
#if cpu_7d.len() > 0 {
  v(0.5em)
  section-title("Metrics Trends (Last 7 Days)")
  lq.diagram(
    width: 100%,
    height: 160pt,
    xlabel: [#text(size: 8pt)[Time (hours)]],
    ylabel: [#text(size: 8pt)[Usage (%)]],
    legend: (position: bottom),
    grid: stroke(0.2pt + border-clr),
    lq.plot(
      range(cpu_7d.len()), cpu_7d,
      stroke: brand,
      smooth: true,
      label: [CPU],
    ),
    lq.plot(
      range(memory_7d.len()), memory_7d,
      stroke: rgb("#1565c0"),
      smooth: true,
      label: [Memory],
    ),
    lq.plot(
      range(disk_7d.len()), disk_7d,
      stroke: green,
      smooth: true,
      label: [Disk],
    ),
  )
}

// ── Insights ─────────────────────────────────────────────────────────────────
#if insights.len() > 0 {
  v(0.5em)
  section-title("Insights")
  callout-box[
    #for line in insights {
      text("- " + line)
      v(0.15em)
    }
  ]
}
