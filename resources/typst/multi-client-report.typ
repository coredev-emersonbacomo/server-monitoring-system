#import "base.typ": *
#let d = json("input.json")

#for (i, item) in d.items.enumerate() {
  let servers = item.at("servers", default: ())
  let insights = item.at("insights", default: ())
  let charts = item.at("charts", default: none)

  grid(columns: (1fr, auto), gutter: 12pt)[
    #block[
      #report-heading(
        item.name,
        "Client-specific report",
      )
    ]
    #block(
      fill: brand,
      inset: (x: 10pt, y: 6pt),
      radius: 4pt,
    )[
      #set text(size: 9pt, weight: "bold", fill: white)
      #text(str(i + 1) + " of " + str(d.items.len()))
    ]
  ]

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
