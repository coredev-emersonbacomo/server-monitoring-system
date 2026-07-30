#set text(font: "DejaVu Sans", size: 10pt, fill: rgb("#222222"))
#set par(justify: false)

// ── Colours ──────────────────────────────────────────────────────────────────
#let brand       = rgb("#1a237e")
#let accent      = rgb("#3949ab")
#let bg-light    = rgb("#f4f5f7")
#let border-clr  = rgb("#dddddd")
#let text-muted  = rgb("#777777")
#let text-dark   = rgb("#222222")
#let green       = rgb("#2e7d32")
#let amber       = rgb("#e65100")
#let red         = rgb("#c62828")
#let grey        = rgb("#9e9e9e")

// ── Re-usable components ─────────────────────────────────────────────────────

#let report-heading(title, subtitle, email: none, location: none, phone: none) = {
  block(below: 1.2em)[
    #text(size: 16pt, weight: "bold", fill: brand)[#title]
    #v(0.15em)
    #text(size: 9pt, fill: text-muted)[#subtitle]
    #if email != none or location != none or phone != none {
      v(0.1em)
      text(size: 7.5pt, fill: text-muted)[
        #if email != none { "Email: " + email }
        #if location != none { "  |  Location: " + location }
        #if phone != none { "  |  Contact: " + phone }
      ]
    }
  ]
}

#let kpi-card(label, value, note: none) = {
  let c = if note != none { bg-light } else { bg-light }
  block(
    width: 100%,
    fill: c,
    inset: (x: 10pt, y: 8pt),
    radius: 4pt,
    stroke: 0.3pt + border-clr,
  )[
    #text(size: 8pt, fill: text-muted, weight: "medium")[#label]
    #v(0.2em)
    #text(size: 13pt, weight: "bold", fill: text-dark)[#value]
    #if note != none {
      v(0.1em)
      text(size: 7.5pt, fill: text-muted)[#note]
    }
  ]
}

#let kpi-grid(items, columns: 3) = {
  let cols = (1fr,) * columns
  grid(
    columns: cols,
    gutter: 8pt,
    ..items.map(i => kpi-card(i.at("label"), i.at("value"), note: i.at("note", default: none))),
  )
}

#let status-pill(status) = {
  let bg = if status == "online" or status == "healthy" { rgb("#e8f5e9") }
    else if status == "warning" { rgb("#fff3e0") }
    else if status == "offline" or status == "critical" or status == "down" { rgb("#ffebee") }
    else { rgb("#f5f5f5") }
  let fg = if status == "online" or status == "healthy" { green }
    else if status == "warning" { amber }
    else if status == "offline" or status == "critical" or status == "down" { red }
    else { grey }
  let label = if status == "online" { "Online" }
    else if status == "offline" { "Offline" }
    else if status == "warning" { "Warning" }
    else if status == "critical" { "Critical" }
    else if status == "down" { "Down" }
    else if status == "healthy" { "Healthy" }
    else { str(status) }
  block(
    fill: bg,
    inset: (x: 8pt, y: 3pt),
    radius: 3pt,
    width: auto,
  )[
    #set text(size: 10pt, weight: "bold", fill: fg)
    #label
  ]
}

#let progress-bar(pct, label: none) = {
  let bar-color = if pct >= 98 { green }
    else if pct >= 90 { amber }
    else { red }
  let w = pct / 100
  block(
    width: 100%,
    height: 10pt,
    fill: rgb("#e0e0e0"),
    radius: 2pt,
  )[
    #box(
      width: w * 100%,
      height: 100%,
      fill: bar-color,
      radius: 2pt,
      inset: 0pt,
    )
  ]
  if label != none {
    v(0.15em)
    text(size: 7pt, fill: text-muted)[#label]
  }
}

#let callout-box(body) = {
  block(
    fill: rgb("#f0f4ff"),
    inset: (x: 12pt, y: 10pt),
    radius: 4pt,
    stroke: 0.5pt + rgb("#c5cae9"),
  )[#body]
}

#let section-title(title) = {
  block(above: 1em, below: 0.4em)[
    #text(size: 10.5pt, weight: "bold", fill: brand)[#title]
  ]
}

#let data-table(headers: (), rows: (), widths: auto) = {
  let hdr-cols = headers.len()
  let col-w = if widths == auto { (1fr,) * hdr-cols } else { widths }
  table(
    columns: col-w,
    stroke: 0.3pt + border-clr,
    inset: 6pt,
    table.header(
      ..headers.map(h => table.cell(
        fill: brand,
        inset: (x: 6pt, y: 4pt),
      )[
        #set text(size: 8pt, weight: "bold", fill: white)
        #h
      ])
    ),
    ..rows.enumerate().map(((idx, row)) =>
      row.map(cell =>
        table.cell(
          fill: if calc.odd(idx + 1) { white } else { bg-light },
          inset: (x: 6pt, y: 3.5pt),
        )[
          #set text(size: 8.5pt, fill: text-dark)
          #cell
        ]
      )
    ).flatten()
  )
}

#let sub-table(headers: (), rows: (), row-fills: ()) = {
  let hdr-cols = headers.len()
  table(
    columns: (1fr,) * hdr-cols,
    stroke: (x: none, y: 0.05pt),
    inset: 5pt,
    table.header(
      ..headers.map(h => table.cell(
        fill: rgb("#e8eaf6"),
        inset: (x: 6pt, y: 4pt),
      )[
        #set text(size: 7.5pt, weight: "bold", fill: brand)
        #h
      ])
    ),
    ..rows.map(row => (
      ..row.map(cell => table.cell(
        // fill: bg-light,
        inset: (x: 5pt, y: 3.5pt),
      )[
        #set text(size: 8pt, fill: text-dark)
        #cell
      ])
    )).flatten()
  )
}

#let pct(value) = {
  let s = str(calc.round(value, digits: 2))
  let parts = s.split(".")
  if parts.len() == 1 {
    parts.at(0) + ".00%"
  } else if parts.at(1).len() == 1 {
    parts.at(0) + "." + parts.at(1) + "0%"
  } else {
    s + "%"
  }
}
#let fmt-money(value) = {
  "₱" + str(calc.round(value, digits: 2))
}
#let fmt-date(iso) = {
  iso.split("T").at(0)
}
