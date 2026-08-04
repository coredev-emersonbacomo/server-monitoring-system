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
  kpi-table((
    (label: "Total Servers", value: str(item.at("total_servers", default: 0))),
    (label: "Online",        value: text(fill: green, weight: "bold")[#str(item.at("online_servers", default: 0))]),
    (label: "Offline",       value: text(fill: red, weight: "bold")[#str(item.at("offline_servers", default: 0))]),
    (label: "Active Alerts", value: str(item.at("total_alerts", default: 0))),
    (label: "Avg CPU",       value: if item.at("avg_cpu_usage", default: none) != none { pct(item.avg_cpu_usage) } else { "—" }),
    (label: "Avg Memory",    value: if item.at("avg_memory_usage", default: none) != none { pct(item.avg_memory_usage) } else { "—" }),
    (label: "Budget",        value: "₱" + str(item.at("budget", default: 0))),
    (
      label: "Total Subscription Fee",
      value: {
        let budget = float(item.at("budget", default: 0))
        let fee = float(item.at("total_subscription_fee", default: 0))

        let ratio = if budget > 0 { fee / budget } else { 0.0 }

        let fee-color = if ratio >= 0.9 {
          rgb("#c5221f")
        } else if ratio >= 0.7 {
          rgb("#b06000")
        } else {
          rgb("#137333")
        }

        text(weight: "bold", fill: fee-color)[₱#str(item.at("total_subscription_fee", default: 0))]
      }
    ),
  ))

  if servers.len() > 0 {
    v(0.5em)
    section-title("Servers")
    data-table(
      headers: ("Server", "Status", "CPU", "Memory", "Disk Size", "Used Disk", "Monthly Fee"),
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
        text(weight: "bold", fill: green)[₱#str(item.at("subscription_fee", default: 0))]
      )),
      widths: (1.2fr, 0.5fr, 1.5fr, 0.5fr, 0.7fr, 0.5fr, 1fr),
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
