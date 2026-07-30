#import "base.typ": *
#let d = json("input.json")

#set page(
  paper: d.at("paper", default: "a4"),
  flipped: d.at("orientation", default: "portrait") == "landscape",
  margin: (top: 3cm, bottom: 2.5cm, x: 1.5cm),
  header: page-header("Multi-Client Report"),
  footer: context [
    #set text(size: 8pt, fill: rgb("#999999"))
    #line(length: 100%, stroke: 0.3pt + rgb("#dddddd"))
    #v(0.3em)
    Confidential
    #h(1fr)
    Page #counter(page).display()
    #h(1fr)
    Client #counter("client-num").display()
  ],
)

#for (i, item) in d.items.enumerate() {
  counter("client-num").update(i + 1)
  counter(page).update(1)

  let servers = item.at("servers", default: ())
  let insights = item.at("insights", default: ())
  let charts = item.at("charts", default: none)

  report-heading(
    item.name,
    "Client-specific report",
    email: item.at("email", default: none),
    location: item.at("location", default: none),
    phone: item.at("contact", default: none),
  )

  section-title("Overview")
  kpi-grid((
    (label: "Total Servers", value: str(item.at("total_servers", default: 0))),
    (label: "Online",        value: text(fill: green, weight: "bold")[#str(item.at("online_servers", default: 0))]),
    (label: "Offline",       value: text(fill: red, weight: "bold")[#str(item.at("offline_servers", default: 0))]),
    (label: "Active Alerts", value: str(item.at("total_alerts", default: 0))),
    (label: "Avg CPU",       value: if item.at("avg_cpu_usage", default: none) != none { pct(item.avg_cpu_usage) } else { "—" }),
    (label: "Avg Memory",    value: if item.at("avg_memory_usage", default: none) != none { pct(item.avg_memory_usage) } else { "—" }),
  ))

  if servers.len() > 0 {
    v(0.5em)
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

  if charts != none and "cpu" in charts {
    v(0.5em)
    section-title("Metrics")
    image(bytes(charts.cpu), width: 100%, height: 140pt)
  }

  if insights.len() > 0 {
    v(0.5em)
    section-title("Insights")
    callout-box[
      #for line in insights {
        text("- " + line)
        v(0.15em)
      }
    ]
  }

  if i < d.items.len() - 1 {
    pagebreak()
  }
}
