#import "base.typ": *
#import "@preview/lilaq:0.6.0" as lq
#let d = json("input.json")

#set text(font: theme-font, size: 10pt, fill: text-dark)
#set par(justify: false)

#set page(
  paper: d.at("paper", default: "a4"),
  flipped: d.at("orientation", default: "portrait") == "landscape",
  margin: (top: 3cm, bottom: 2.5cm, x: 1.5cm),
  header: page-header("Multi-Server Report"),
  footer: context [
    #set text(size: 8pt, fill: rgb("#999999"))
    #line(length: 100%, stroke: 0.3pt + rgb("#dddddd"))
    #v(0.3em)
    Confidential
    #h(1fr)
    Page #counter(page).display()
    #h(1fr)
    Server #counter("server-num").display()
  ],
)

#for (i, item) in d.items.enumerate() {
  counter("server-num").update(i + 1)
  counter(page).update(1)

  let metrics = item.at("metrics", default: ())
  let uptime = item.at("uptime", default: none)
  let charts = item.at("charts", default: none)
  let insights = item.at("insights", default: ())
  let cpu_7d = item.at("cpu_7d", default: ())
  let memory_7d = item.at("memory_7d", default: ())
  let disk_7d = item.at("disk_7d", default: ())

  report-heading(
    item.name,
    "Server-specific report",
  )

  section-title("Server Information")
  kpi-table((
    (label: "Status", value: status-pill(item.at("status", default: "unknown"))),
    (label: "Client", value: if item.at("client_name", default: "") != "" { item.client_name } else { "—" }),
    (label: "OS", value: if item.at("operating_system", default: "") != "" { item.operating_system } else { "—" }),
    (
      label: "CPU Model",
      value: if item.at("cpu_model", default: "") != "" {
        (
          item.cpu_model
            + if item.at("cpu_cores", default: none) != none {
              " (" + str(item.cpu_cores) + " cores)"
            } else { "" }
        )
      } else if item.at("cpu_cores", default: none) != none {
        str(item.cpu_cores) + " cores"
      } else {
        "—"
      },
    ),
    (label: "Memory", value: if item.at("ram", default: "") != "" { item.ram } else { "—" }),
    (label: "Disk", value: if item.at("disk", default: "") != "" { item.disk } else { "—" }),
    (
      label: "Subscription Fee",
      value: text(fill: green, weight: "bold")[₱#str(item.at("subscription_fee"))],
    ),
  ))

  if metrics.len() > 0 {
    v(0.5em)
    section-title("Metrics Summary (" + range-label(d.at("hours", default: 24)) + ")")
    let cpu_vals = metrics.map(m => m.cpu_usage)
    let mem_vals = metrics.map(m => m.memory_usage)
    let disk_vals = metrics.map(m => m.disk_usage)

    data-table(
      headers: ("Metric", "Min", "Max", "Average"),
      rows: (
        (
          "CPU Usage",
          pct(calc.min(..cpu_vals)),
          pct(calc.max(..cpu_vals)),
          pct(calc.round(cpu_vals.sum() / cpu_vals.len(), digits: 1)),
        ),
        (
          "Memory Usage",
          pct(calc.min(..mem_vals)),
          pct(calc.max(..mem_vals)),
          pct(calc.round(mem_vals.sum() / mem_vals.len(), digits: 1)),
        ),
        (
          "Disk Usage",
          pct(calc.min(..disk_vals)),
          pct(calc.max(..disk_vals)),
          pct(calc.round(disk_vals.sum() / disk_vals.len(), digits: 1)),
        ),
      ),
    )
  }

  if uptime != none {
    v(0.5em)
    section-title("SLA Uptime")
    table(
      columns: (1.2fr, 2.8fr),
      stroke: 0.3pt + border-clr,
      inset: (x: 10pt, y: 8pt),
      align: (left + horizon, left + horizon),
      table.cell(fill: bg-light)[
        #set text(size: 8.5pt, weight: "bold", fill: text-dark)
        Uptime
      ],
      table.cell()[
        #progress-bar(uptime.uptime_percentage)
      ],
      table.cell(fill: bg-light)[
        #set text(size: 8.5pt, weight: "bold", fill: text-dark)
        Uptime (hrs)
      ],
      table.cell()[
        #set text(size: 9pt, fill: text-dark)
        #uptime-text(uptime.uptime_hours, uptime.range_hours)
      ],
      table.cell(fill: bg-light)[
        #set text(size: 8.5pt, weight: "bold", fill: text-dark)
        Outages
      ],
      table.cell()[
        #set text(size: 9pt, fill: text-dark)
        #str(uptime.at("outage_count", default: 0))
        #let last = uptime.at("last_downtime", default: none)
        #if last != none [
          #h(0.4em)
          #text(size: 8pt, fill: text-muted)[(Last: #last)]
        ]
      ],
    )
  }

  if charts != none and "cpu" in charts {
    v(0.5em)
    section-title("CPU Usage Chart")
    image(bytes(charts.cpu), width: 100%, height: 160pt)
  }

  if cpu_7d.len() > 0 {
    let trend_x_raw = trend-x-components(item.at("trend_x", default: ()))
    let trend_x = if trend_x_raw.len() == cpu_7d.len() {
      trend_x_raw
    } else {
      range(cpu_7d.len())
    }

    v(0.5em)
    section-title("Metrics Trends (" + range-label(d.at("hours", default: 24)) + ")")
    let x-span = if trend_x.len() >= 2 { (trend_x.last() - trend_x.first()).hours() } else { 0 }
    let is-daily = d.at("hours", default: 24) >= 168
    let trend-xaxis = if (
      trend_x.len() > 0 and type(trend_x.first()) == datetime and (trend_x.len() <= 12 or x-span < 30 or is-daily)
    ) {
      let step = if trend_x.len() <= 12 { 1 } else { calc.ceil(trend_x.len() / 8) }
      (
        ticks: range(0, trend_x.len(), step: step).map(i => (
          trend_x.at(i),
          trend-point-label(trend_x.at(i), trend_x, is-daily: is-daily),
        )),
      )
    } else if trend_x.len() > 0 and type(trend_x.first()) == datetime {
      (tick-args: (density: 40%), format-ticks: lq.format-ticks-datetime.with(format: trend-tick-format))
    } else {
      (tick-args: (density: 40%))
    }

    // Move the legend a bit on the top, so that it won't hinder the plots
    show lq.selector(lq.legend): leg => move(dy: -23pt, leg)
    show lq.selector(lq.legend): set grid(columns: 6)

    lq.diagram(
      width: 100%,
      height: 160pt,
      xaxis: trend-xaxis,
      xlabel: [#text(size: 8pt)[Time]],
      ylabel: [#text(size: 8pt)[Usage (%)]],
      grid: stroke(0.2pt + border-clr),
      lq.plot(
        trend_x,
        cpu_7d,
        stroke: brand,
        label: [CPU],
      ),
      lq.plot(
        trend_x,
        memory_7d,
        stroke: rgb("#1565c0"),
        label: [Memory],
      ),
      lq.plot(
        trend_x,
        disk_7d,
        stroke: green,
        label: [Disk],
      ),
    )
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
