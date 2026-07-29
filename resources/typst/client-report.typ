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

#let servers = d.at("servers", default: ())
#let insights = d.at("insights", default: ())
#let charts = d.at("charts", default: none)

// ── Report heading ───────────────────────────────────────────────────────────
#report-heading(
  d.at("name", default: "Client Report"),
  d.at("report_subtitle", default: "Client-specific server overview"),
)

// ── KPI Summary ──────────────────────────────────────────────────────────────
#section-title("KPI Summary")
#kpi-grid((
  (label: "Total Servers", value: str(d.at("total_servers", default: 0))),
  (label: "Online",        value: text(fill: green, weight: "bold")[#str(d.at("online_servers", default: 0))]),
  (label: "Offline",       value: text(fill: red, weight: "bold")[#str(d.at("offline_servers", default: 0))]),
  (label: "Active Alerts", value: str(d.at("total_alerts", default: 0))),
  (label: "Avg CPU",       value: if d.at("avg_cpu_usage", default: none) != none { pct(d.at("avg_cpu_usage", default: 0)) } else { "—" }),
  (label: "Avg Memory",    value: if d.at("avg_memory_usage", default: none) != none { pct(d.at("avg_memory_usage", default: 0)) } else { "—" }),
))

// ── Servers Table ────────────────────────────────────────────────────────────
#if servers.len() > 0 {
  section-title("Servers")
  data-table(
    headers: ("Server", "Status", "CPU", "Memory", "Disk", "Uptime", "Last Seen"),
    rows: servers.map(s => (
      s.name,
      status-pill(s.at("status", default: "unknown")),
      if s.at("cpu_usage", default: none) != none { pct(s.cpu_usage) } else { "—" },
      if s.at("memory_usage", default: none) != none { pct(s.memory_usage) } else { "—" },
      if s.at("disk_usage", default: none) != none { pct(s.disk_usage) } else { "—" },
      if s.at("uptime_percentage", default: none) != none { pct(s.uptime_percentage) } else { "—" },
      if s.at("last_seen", default: "") != "" { fmt-date(s.last_seen) } else { "—" },
    )),
  )
}

// ── SLA Uptime ───────────────────────────────────────────────────────────────
#if servers.len() > 0 {
  v(0.5em)
  section-title("SLA Uptime")
  data-table(
    headers: ("Server", "Uptime %"),
    rows: servers.map(s => (
      s.name,
      progress-bar(s.at("uptime_percentage", default: 0)),
    )),
    widths: (1.5fr, 4fr),
  )
}

// ── Charts ───────────────────────────────────────────────────────────────────
#if charts != none and "cpu" in charts {
  v(0.5em)
  section-title("Metrics")
  image(bytes(charts.cpu), width: 100%, height: 140pt)
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
