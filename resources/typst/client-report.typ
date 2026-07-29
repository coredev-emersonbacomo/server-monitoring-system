// client-report.typ — Client-specific server monitoring report
#import "base.typ": *

// Data comes from sys.inputs via JSON file
#let d = json("input.json")

// Report header
#block(below: 1.5em)[
  #text(size: 18pt, weight: "bold")[#d.name]
  #v(0.2em)
  #text(size: 10pt, fill: text-muted)[Client-specific report]
  #v(0.3em)
  #text(size: 9pt, fill: text-muted)[Generated #d.generated_at]
]

// Overview section
#section-heading("Overview")
#kv-table((
  (label: "Total Servers", value: str(d.total_servers)),
  (label: "Online", value: text(fill: green, weight: "medium")[#str(d.online_servers)]),
  (label: "Offline", value: text(fill: red, weight: "medium")[#str(d.offline_servers)]),
  (label: "Total Alerts", value: str(d.total_alerts)),
  (label: "Avg CPU", value: pct(d.avg_cpu_usage)),
  (label: "Avg Memory", value: pct(d.avg_memory_usage)),
))

#v(1em)

// Servers section
#section-heading("Servers")
#data-table(
  headers: ("Server", "Status", "CPU", "Memory", "Disk", "Uptime %", "Last Seen"),
  rows: d.servers.map(s => (
    s.name,
    status-text(s.status),
    pct(s.cpu_usage),
    pct(s.memory_usage),
    pct(s.disk_usage),
    str(s.uptime_percentage) + "%",
    if s.last_seen != "" { s.last_seen } else { "—" },
  )),
)
