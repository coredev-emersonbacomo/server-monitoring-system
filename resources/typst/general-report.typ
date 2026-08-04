#import "base.typ": *

#let d = json("input.json")

#set page(
  paper: d.at("paper", default: "a4"),
  flipped: d.at("orientation", default: "portrait") == "landscape",
  margin: (top: 3cm, bottom: 2.5cm, x: 1.5cm),
  header: page-header(d.at("report_title", default: "Report")),
  footer: context [
    #set text(size: 8pt, fill: rgb("#999999"))
    #line(length: 100%, stroke: 0.3pt + rgb("#dddddd"))
    #v(0.3em)
    Confidential Internal Data
    #h(1fr)
    Page #counter(page).display() of #counter(page).final().first()
  ],
)

// ── Report heading ───────────────────────────────────────────────────────────
#report-heading(
  d.at("report_title", default: "Global Report"),
  d.at("report_subtitle", default: "System-wide overview of all clients and servers"),
)

// ── KPI Summary Grid ─────────────────────────────────────────────────────────
#section-title("KPI Summary")
#kpi-table((
  (label: "Total Servers", value: str(d.at("total_servers", default: 0))),
  (label: "Total Clients", value: str(d.at("total_clients", default: 0))),
  (label: "Total Users", value: str(d.at("total_users", default: 0))),
  (label: "Active Alerts", value: str(d.at("total_alerts", default: 0))),
  (label: "Online Servers", value: text(fill: green, weight: "bold")[#str(d.at("online_servers", default: 0))]),
  (label: "Offline Servers", value: text(fill: red, weight: "bold")[#str(d.at("offline_servers", default: 0))]),
  (label: "Budget", value: "₱" + str(d.at("sum_client_budget", default: 0))),
  (
    label: "Total Subscription Fee",
    value: {
      let budget = float(d.at("sum_client_budget", default: 0))
      let fee = float(d.at("sum_server_subscription_fee", default: 0))

      let ratio = if budget > 0 { fee / budget } else { 0.0 }

      let fee-color = if ratio >= 0.9 {
        rgb("#c5221f")
      } else if ratio >= 0.7 {
        rgb("#b06000")
      } else {
        rgb("#137333")
      }

      text(weight: "bold", fill: fee-color)[₱#str(d.at("sum_server_subscription_fee", default: 0))]
    },
  ),
))

// ── Server Performance ───────────────────────────────────────────────────────
#let attention = d.at("need_attention_servers", default: ())
#let sla_servers = d.at("sla_servers", default: ())
#let srv_per_client = d.at("servers_per_client", default: ())
#let recent_clients = d.at("recent_clients", default: ())
#let recent_servers = d.at("recent_servers", default: ())
#let insights = d.at("insights", default: ())
#let charts = d.at("charts", default: none)

#if attention.len() > 0 {
  section-title("Server Performance")
  grid(columns: 1fr, gutter: 10pt)[
    #block[
      #text(size: 8.5pt, weight: "bold", fill: red)[Need Attention]
      #v(0.3em)
      #sub-table(
        headers: ("Server", "CPU", "Memory", "Status", "Uptime"),
        rows: attention.map(s => (
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
      if s.uptime_percentage >= 98 { status-pill("healthy") } else if s.uptime_percentage >= 90 {
        status-pill("warning")
      } else { status-pill("critical") },
    )),
    widths: (1.5fr, 3fr, 1fr),
  )
}

// ── Ownership & Activity ─────────────────────────────────────────────────────
#v(0.5em)
#section-title("Ownership & Recent Activity")

#grid(columns: 1fr, gutter: 10pt)[
  #block(width: auto)[
    #text(size: 8.5pt, weight: "bold", fill: brand)[Servers per Client]
    #v(0.3em)
    #sub-table(
      headers: ("Client", "Servers", "Share", "Active Alerts"),
      rows: srv_per_client.map(c => (
        c.client_name,
        str(c.server_count),
        if d.at("total_servers", default: 0) > 0 {
          str(calc.round(c.server_count * 100 / d.at("total_servers", default: 0), digits: 1)) + "%"
        } else { "0%" },
        {
          let a = c.at("active_alerts", default: 0)
          if a > 0 { text(fill: red, weight: "bold")[#str(a)] } else { text(fill: text-muted)[-] }
        },
      )),
    )
  ]
  #block(width: auto)[
    #text(size: 8.5pt, weight: "bold")[Recently Added (Last 30 Days)]
    #v(0.3em)
    #grid(columns: 1fr, gutter: 6pt)[
      #block[
        #text(size: 7.5pt, weight: "medium")[Clients]
        #v(-1em)
        #if recent_clients.len() > 0 {
          sub-table(
            headers: ("Name", "Email", "Phone", "Added"),
            rows: recent_clients.map(c => (c.name, c.email, c.phone, fmt-date(c.created_at))),
          )
        } else {
          text(size: 8pt, fill: text-muted)[None]
        }
      ]
      #block[
        #text(size: 7.5pt, weight: "medium")[Servers]
        #v(-1em)
        #if recent_servers.len() > 0 {
          sub-table(
            headers: ("Name", "Client", "Hostname", "Added"),
            rows: recent_servers.map(s => (s.name, s.assigned_client, s.hostname, fmt-date(s.created_at))),
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
