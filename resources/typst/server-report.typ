#import "base.typ": *

#let d = json("input.json")

#set page(
  paper: d.at("paper", default: "a4"),
  flipped: d.at("orientation", default: "landscape") == "landscape",
  margin: (x: 18mm, y: 20mm),
  header: context [
    #set text(size: 9pt, fill: rgb("#888888"))
    #h(1fr)
    #d.at("name", default: "Report")
    #h(1fr)
    #if counter(page).get().first() > 1 {
      d.at("report_subtitle", default: "")
    }
    #v(-0.8em)
    #line(length: 100%, stroke: 0.3pt + rgb("#dddddd"))
  ],
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

// ── Report heading ───────────────────────────────────────────────────────────
#report-heading(
  d.at("name", default: "Server Report"),
  d.at("report_subtitle", default: "Server-specific performance and metrics"),
)

// ── Server Information ───────────────────────────────────────────────────────
#section-title("Server Information")
#kpi-grid((
  (label: "Status",        value: status-pill(d.at("status", default: "unknown"))),
  (label: "Client",        value: if d.at("client_name", default: "") != "" { d.client_name } else { "—" }),
  (label: "OS",            value: if d.at("operating_system", default: "") != "" { d.operating_system } else { "—" }),
  (label: "CPU Model",     value: if d.at("cpu_model", default: "") != "" { d.cpu_model } else { "—" }, note: str(d.at("cpu_cores", default: "—")) + " cores"),
  (label: "Memory",        value: if d.at("ram", default: "") != "" { d.ram } else { "—" }),
  (label: "Disk",          value: if d.at("disk", default: "") != "" { d.disk } else { "—" }),
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
  grid(columns: (1fr, 1fr), gutter: 10pt)[
    #kpi-card("Uptime Percentage", pct(uptime.uptime_percentage))
    #kpi-card("Outages", str(uptime.at("outage_count", default: 0)),
      note: if uptime.at("last_downtime", default: "") != "" { "Last: " + uptime.last_downtime } else { none })
  ]
  v(0.3em)
  progress-bar(uptime.uptime_percentage)
}

// ── Charts ───────────────────────────────────────────────────────────────────
#if charts != none and "cpu" in charts {
  v(0.5em)
  section-title("CPU Usage Chart")
  image(bytes(charts.cpu), width: 100%, height: 160pt)
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
