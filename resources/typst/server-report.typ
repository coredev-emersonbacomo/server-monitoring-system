// server-report.typ — Server-specific monitoring report
#import "base.typ": *

#let d = json("input.json")

// Report header
#block(below: 1.5em)[
  #text(size: 18pt, weight: "bold")[#d.name]
  #v(0.2em)
  #text(size: 10pt, fill: text-muted)[Server-specific report]
  #v(0.3em)
  #text(size: 9pt, fill: text-muted)[Generated #d.generated_at]
]

// Server Info
#section-heading("Server Information")
#kv-table((
  (label: "Server", value: d.name),
  (label: "Client", value: if d.client_name != "" { d.client_name } else { "—" }),
  (label: "OS", value: if d.operating_system != "" { d.operating_system } else { "—" }),
  (label: "Status", value: status-text(d.status)),
  (label: "CPU", value: if d.cpu_model != "" { d.cpu_model } else { "—" }),
  (label: "Cores", value: if d.cpu_cores != "" { str(d.cpu_cores) } else { "—" }),
  (label: "RAM", value: if d.ram != "" { d.ram } else { "—" }),
  (label: "Disk", value: if d.disk != "" { d.disk } else { "—" }),
  (label: "Last Seen", value: if d.last_seen != "" { d.last_seen } else { "—" }),
))

#v(1em)

// Metrics Summary
#section-heading("Metrics Summary (Last 24 Hours)")
#{
  if d.metrics.len() > 0 {
    let cpu-values = d.metrics.map(m => m.cpu_usage)
    let mem-values = d.metrics.map(m => m.memory_usage)
    let disk-values = d.metrics.map(m => m.disk_usage)

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
}

#v(1em)

// Uptime
#section-heading("Uptime")
#kv-table((
  (label: "Uptime %", value: pct(d.uptime.uptime_percentage)),
  (label: "Outages", value: str(d.uptime.outage_count)),
  (label: "Last Downtime", value: if d.uptime.last_downtime != "" { d.uptime.last_downtime } else { "None recorded" }),
))

// Chart SVG if provided
#{
  if d.at("charts", default: none) != none and d.charts.at("cpu", default: none) != none {
    v(1em)
    section-heading("CPU Usage Chart")
    image(
      bytes(d.charts.cpu),
      width: 100%,
      height: 200pt,
    )
  }
}
