// multi-client-report.typ — Multiple client reports in one PDF
#import "base.typ": *

#let d = json("input.json")

#for (i, item) in d.items.enumerate() {
  // Report header
  block(below: 1.5em)[
    #text(size: 18pt, weight: "bold")[#item.name]
    #v(0.2em)
    #text(size: 10pt, fill: text-muted)[Client-specific report #str(i + 1) of #str(d.items.len())]
    #v(0.3em)
    #text(size: 9pt, fill: text-muted)[Generated #d.generated_at]
  ]

  // Overview section
  section-heading("Overview")
  kv-table((
    (label: "Total Servers", value: str(item.total_servers)),
    (label: "Online", value: text(fill: green, weight: "medium")[#str(item.online_servers)]),
    (label: "Offline", value: text(fill: red, weight: "medium")[#str(item.offline_servers)]),
    (label: "Total Alerts", value: str(item.total_alerts)),
    (label: "Avg CPU", value: pct(item.avg_cpu_usage)),
    (label: "Avg Memory", value: pct(item.avg_memory_usage)),
  ))

  v(1em)

  // Servers section
  section-heading("Servers")
  data-table(
    headers: ("Server", "Status", "CPU", "Memory", "Disk", "Uptime %", "Last Seen"),
    rows: item.servers.map(s => (
      s.name,
      status-text(s.status),
      pct(s.cpu_usage),
      pct(s.memory_usage),
      pct(s.disk_usage),
      str(s.uptime_percentage) + "%",
      if s.last_seen != "" { s.last_seen } else { "—" },
    )),
  )

  // Page break between reports (not after the last one)
  if i < d.items.len() - 1 {
    pagebreak()
  }
}
