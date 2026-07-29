// general-report.typ — Global system overview report
#import "base.typ": *

#let d = json("input.json")

// Report header
#block(below: 1.5em)[
  #text(size: 18pt, weight: "bold")[Global Report]
  #v(0.2em)
  #text(size: 10pt, fill: text-muted)[System-wide overview of all clients and servers]
  #v(0.3em)
  #text(size: 9pt, fill: text-muted)[Generated #d.generated_at]
]

// Overview
#section-heading("Overview")
#kv-table((
  (label: "Total Servers", value: str(d.total_servers)),
  (label: "Total Clients", value: str(d.total_clients)),
  (label: "Total Users", value: str(d.total_users)),
  (label: "Online", value: text(fill: green, weight: "medium")[#str(d.online_servers)]),
  (label: "Offline", value: text(fill: red, weight: "medium")[#str(d.offline_servers)]),
  (label: "Total Alerts", value: str(d.total_alerts)),
))

#v(1em)

// Servers per Client
#section-heading("Servers per Client")
#data-table(
  headers: ("Client", "No. of Servers", "Percentage"),
  rows: d.servers_per_client.map(c => (
    c.client_name,
    str(c.server_count),
    if d.total_servers > 0 {
      str(calc.round(c.server_count * 100 / d.total_servers, digits: 1)) + "%"
    } else {
      "0%"
    },
  )),
)

// Server Assignment
#v(1em)
#section-heading("Server Assignment")
#text(size: 9pt, fill: text-muted)[(#d.unassigned_servers unassigned)]
#{
  let assigned = d.total_servers - d.unassigned_servers
  data-table(
    headers: ("Category", "No. of Servers", "Percentage"),
    rows: (
      ("Assigned", str(assigned), if d.total_servers > 0 { str(calc.round(assigned * 100 / d.total_servers, digits: 1)) + "%" } else { "0%" }),
      ("Unassigned", str(d.unassigned_servers), if d.total_servers > 0 { str(calc.round(d.unassigned_servers * 100 / d.total_servers, digits: 1)) + "%" } else { "0%" }),
    ),
  )
}

#v(1em)

// System Health
#section-heading("System Health")
#kv-table((
  (label: "Avg Uptime", value: pct(d.avg_uptime_percentage)),
  (label: "Avg CPU", value: pct(d.avg_cpu_usage)),
  (label: "Avg Memory", value: pct(d.avg_memory_usage)),
  (label: "Avg Disk", value: pct(d.avg_disk_usage)),
))

#v(1em)

// Recently Added
#section-heading("Recently Added Clients")
#if d.recent_clients.len() > 0 {
  data-table(
    headers: ("Client", "Added"),
    rows: d.recent_clients.map(c => (c.name, c.created_at)),
  )
} else {
  text(fill: text-muted)[No recent clients.]
}

#v(0.5em)

#section-heading("Recently Added Servers")
#if d.recent_servers.len() > 0 {
  data-table(
    headers: ("Server", "Added"),
    rows: d.recent_servers.map(s => (s.name, s.created_at)),
  )
} else {
  text(fill: text-muted)[No recent servers.]
}

#v(1em)

// Alerts Summary
#section-heading("Alerts Summary")
#kv-table((
  (label: "Total Alerts", value: str(d.total_alerts)),
  (label: "Critical", value: text(fill: red, weight: "medium")[#str(d.critical_alerts)]),
  (label: "Warning", value: text(fill: yellow, weight: "medium")[#str(d.warning_alerts)]),
))
