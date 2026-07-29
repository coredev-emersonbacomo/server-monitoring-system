#import "base.typ": *

#let d = json("input.json")

// ── Report heading ───────────────────────────────────────────────────────────
#report-heading(
  d.at("report_title", default: "Global Report"),
  d.at("report_subtitle", default: "System-wide overview of all clients and servers"),
)

// ── KPI Summary Grid ─────────────────────────────────────────────────────────
#section-title("KPI Summary")
#kpi-grid((
  (label: "Total Servers",   value: str(d.at("total_servers", default: 0))),
  (label: "Total Clients",   value: str(d.at("total_clients", default: 0))),
  (label: "Total Users",     value: str(d.at("total_users", default: 0))),
  (label: "Active Alerts",   value: str(d.at("total_alerts", default: 0))),
  (label: "Fleet Uptime",    value: if d.at("avg_uptime_percentage", default: none) != none { pct(d.at("avg_uptime_percentage", default: 0)) } else { "—" }),
  (label: "Monthly Cost",    value: if d.at("monthly_cost", default: none) != none { fmt-money(d.at("monthly_cost", default: 0)) } else { "—" }),
))

// ── Server Performance ───────────────────────────────────────────────────────
#let tops = d.at("top_servers", default: ())
#let worsts = d.at("worst_servers", default: ())
#let sla_servers = d.at("sla_servers", default: ())
#let srv_per_client = d.at("servers_per_client", default: ())
#let recent_clients = d.at("recent_clients", default: ())
#let recent_servers = d.at("recent_servers", default: ())
#let insights = d.at("insights", default: ())
#let charts = d.at("charts", default: none)

#if tops.len() > 0 and worsts.len() > 0 {
  section-title("Server Performance")
  grid(columns: (1fr, 1fr), gutter: 10pt)[
    #block[
      #text(size: 8.5pt, weight: "bold", fill: green)[Top Performing]
      #v(0.3em)
      #sub-table(
        headers: ("Server", "CPU", "Memory", "Status", "Uptime"),
        rows: tops.map(s => (
          s.name,
          pct(s.cpu_usage),
          pct(s.memory_usage),
          status-pill(s.status),
          pct(s.uptime_percentage),
        )),
      )
    ]
    #block[
      #text(size: 8.5pt, weight: "bold", fill: red)[Worst Performing]
      #v(0.3em)
      #sub-table(
        headers: ("Server", "CPU", "Memory", "Status", "Uptime"),
        rows: worsts.map(s => (
          s.name,
          pct(s.cpu_usage),
          pct(s.memory_usage),
          status-pill(s.status),
          pct(s.uptime_percentage),
        )),
      )
    ]
  ]
}

// ── Charts ───────────────────────────────────────────────────────────────────
#if charts != none and "cpu_memory_alert" in charts {
  section-title("Metrics (7-Day Window)")
  image(
    bytes(charts.cpu_memory_alert),
    width: 100%,
    height: 140pt,
  )
}

#v(0.5em)

#if charts != none and "ranked" in charts {
  grid(columns: (1fr, 1fr, 1fr), gutter: 8pt)[
    #block[
      #text(size: 8pt, weight: "bold", fill: text-muted)[Top CPU Load]
      #v(0.3em)
      #image(bytes(charts.ranked), width: 100%, height: 100pt)
    ]
    #block[
      #text(size: 8pt, weight: "bold", fill: text-muted)[Most Alerts]
      #v(0.3em)
      #image(bytes(charts.ranked), width: 100%, height: 100pt)
    ]
    #block[
      #text(size: 8pt, weight: "bold", fill: text-muted)[Highest Cost]
      #v(0.3em)
      #image(bytes(charts.ranked), width: 100%, height: 100pt)
    ]
  ]
}

// ── SLA Uptime Dashboard ─────────────────────────────────────────────────────
#if sla_servers.len() > 0 {
  v(0.5em)
  section-title("SLA Uptime Dashboard")
  data-table(
    headers: ("Server", "Uptime", "Status"),
    rows: sla_servers.map(s => (
      s.name,
      progress-bar(s.uptime_percentage),
      if s.uptime_percentage >= 98 { status-pill("healthy") }
      else if s.uptime_percentage >= 90 { status-pill("warning") }
      else { status-pill("critical") },
    )),
    widths: (1.5fr, 3fr, 1fr),
  )
}

// ── Ownership & Activity ─────────────────────────────────────────────────────
#v(0.5em)
#section-title("Ownership & Recent Activity")

#grid(columns: (1fr, 1fr), gutter: 10pt)[
  #block[
    #text(size: 8.5pt, weight: "bold", fill: brand)[Servers per Client]
    #v(0.3em)
    #sub-table(
      headers: ("Client", "Servers", "Share"),
      rows: srv_per_client.map(c => (
        c.client_name,
        str(c.server_count),
        if d.at("total_servers", default: 0) > 0 {
          str(calc.round(c.server_count * 100 / d.at("total_servers", default: 0), digits: 1)) + "%"
        } else { "0%" },
      )),
    )
  ]
  #block[
    #text(size: 8.5pt, weight: "bold", fill: brand)[Recently Added (Last 30 Days)]
    #v(0.3em)
    #grid(columns: (1fr, 1fr), gutter: 6pt)[
      #block[
        #text(size: 7.5pt, fill: text-muted, weight: "medium")[Clients]
        #v(0.2em)
        #if recent_clients.len() > 0 {
          sub-table(
            headers: ("Name", "Added"),
            rows: recent_clients.map(c => (c.name, fmt-date(c.created_at))),
          )
        } else {
          text(size: 8pt, fill: text-muted)[None]
        }
      ]
      #block[
        #text(size: 7.5pt, fill: text-muted, weight: "medium")[Servers]
        #v(0.2em)
        #if recent_servers.len() > 0 {
          sub-table(
            headers: ("Name", "Added"),
            rows: recent_servers.map(s => (s.name, fmt-date(s.created_at))),
          )
        } else {
          text(size: 8pt, fill: text-muted)[None]
        }
      ]
    ]
  ]
]

// ── Summary Insights ─────────────────────────────────────────────────────────
#if insights.len() > 0 {
  v(0.5em)
  section-title("Diagnostic Insights")
  callout-box[
    #for line in insights {
      text("- " + line)
      v(0.15em)
    }
  ]
}
