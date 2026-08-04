#import "base.typ": *

#let d = json("input.json")

#set page(
  paper: d.at("paper", default: "a4"),
  flipped: d.at("orientation", default: "portrait") == "landscape",
  margin: (top: 3cm, bottom: 2.5cm, x: 1.5cm),
  header: page-header(d.at("name", default: "Client Report")),
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
  email: d.at("email", default: none),
  location: d.at("location", default: none),
  phone: d.at("contact", default: none),
)

// ── KPI Summary ──────────────────────────────────────────────────────────────
#section-title("KPI Summary")
#kpi-table((
  (label: "Total Servers", value: str(d.at("total_servers", default: 0))),
  (label: "Online",        value: text(fill: green, weight: "bold")[#str(d.at("online_servers", default: 0))]),
  (label: "Offline",       value: text(fill: red, weight: "bold")[#str(d.at("offline_servers", default: 0))]),
  (label: "Active Alerts", value: str(d.at("total_alerts", default: 0))),
  (label: "Avg CPU",       value: if d.at("avg_cpu_usage", default: none) != none { pct(d.at("avg_cpu_usage", default: 0)) } else { "—" }),
  (label: "Avg Memory",    value: if d.at("avg_memory_usage", default: none) != none { pct(d.at("avg_memory_usage", default: 0)) } else { "—" }),
  (label: "Budget",        value: str(d.at("budget", default: 0))),
  (label: "Total Subscription Fee",        value: str(d.at("total_subscription_fee", default: 0))),
))

// ── Servers Table ────────────────────────────────────────────────────────────
#if servers.len() > 0 {
  section-title("Servers")
  data-table(
    headers: ("Server", "Status", "CPU", "Memory", "Disk Size", "Used Disk"),
    rows: servers.map(s => (
      s.name,
      status-pill(s.at("status", default: "unknown")),
      (
        if s.at("cpu_model", default: none) != none {
          s.cpu_model + if s.at("cpu_cores", default: none) != none {
            " (" + str(s.cpu_cores) + " cores)"
          } else { "" }
        } else if s.at("cpu_cores", default: none) != none {
          str(s.cpu_cores) + " cores"
        } else { "—" }
      ),
      if s.at("ram", default: none) != none { s.ram } else { "—" },
      if s.at("disk", default: none) != none { s.disk } else { "—" },
      (
        if s.at("disk_used_gb", default: none) != none {
          let used = str(s.disk_used_gb) + " GB"
          if s.at("disk_usage", default: none) != none {
            used + " (" + pct(s.disk_usage) + ")"
          } else { used }
        } else { "—" }
      ),
    )),
    widths: (1.2fr, 0.8fr, 1.5fr, 1fr, 1fr, 1fr),
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
