// multi-server-report.typ — Multiple server reports in one PDF
#import "base.typ": *

#let d = json("input.json")

#for (i, item) in d.items.enumerate() {
  // Report header
  block(below: 1.5em)[
    #text(size: 18pt, weight: "bold")[#item.name]
    #v(0.2em)
    #text(size: 10pt, fill: text-muted)[Server-specific report #str(i + 1) of #str(d.items.len())]
    #v(0.3em)
    #text(size: 9pt, fill: text-muted)[Generated #d.generated_at]
  ]

  // Server Info
  section-heading("Server Information")
  kv-table((
    (label: "Server", value: item.name),
    (label: "Client", value: if item.client_name != "" { item.client_name } else { "—" }),
    (label: "OS", value: if item.operating_system != "" { item.operating_system } else { "—" }),
    (label: "Status", value: status-text(item.status)),
    (label: "CPU", value: if item.cpu_model != "" { item.cpu_model } else { "—" }),
    (label: "Cores", value: if item.cpu_cores != "" { str(item.cpu_cores) } else { "—" }),
    (label: "RAM", value: if item.ram != "" { item.ram } else { "—" }),
    (label: "Disk", value: if item.disk != "" { item.disk } else { "—" }),
    (label: "Last Seen", value: if item.last_seen != "" { item.last_seen } else { "—" }),
  ))

  v(1em)

  // Metrics Summary
  section-heading("Metrics Summary (Last 24 Hours)")
  if item.metrics.len() > 0 {
    let cpu-values = item.metrics.map(m => m.cpu_usage)
    let mem-values = item.metrics.map(m => m.memory_usage)
    let disk-values = item.metrics.map(m => m.disk_usage)

    data-table(
      headers: ("Metric", "Min", "Max", "Average"),
      rows: (
        ("CPU Usage", pct(calc.min(..cpu-values)), pct(calc.max(..cpu-values)), pct(calc.round(cpu-values.sum() / cpu-values.len(), digits: 1))),
        ("Memory Usage", pct(calc.min(..mem-values)), pct(calc.max(..mem-values)), pct(calc.round(mem-values.sum() / mem-values.len(), digits: 1))),
        ("Disk Usage", pct(calc.min(..disk-values)), pct(calc.max(..disk-values)), pct(calc.round(disk-values.sum() / disk-values.len(), digits: 1))),
      ),
    )
  } else {
    text(fill: text-muted)[No metrics data available.]
  }

  v(1em)

  // Uptime
  section-heading("Uptime")
  kv-table((
    (label: "Uptime %", value: pct(item.uptime.uptime_percentage)),
    (label: "Outages", value: str(item.uptime.outage_count)),
    (label: "Last Downtime", value: if item.uptime.last_downtime != "" { item.uptime.last_downtime } else { "None recorded" }),
  ))

  // Page break between reports (not after the last one)
  if i < d.items.len() - 1 {
    pagebreak()
  }
}
