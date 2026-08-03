#set text(font: "Open Sans", size: 10pt, fill: rgb("#222222"))
#set par(justify: false)

// ── Colours ──────────────────────────────────────────────────────────────────
#let brand       = rgb("#ff6c00")
#let accent      = rgb("#ff8f00")
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
    #text(size: 16pt, weight: "bold")[#title]
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
  table(
    columns: (1fr, 2.5fr),
    stroke: 0.3pt + border-clr,
    inset: (x: 8pt, y: 7pt),
    align: (left + horizon, left + horizon),
    ..items.map(item => (
      table.cell(fill: bg-light)[
        #set text(size: 8.5pt, weight: "bold", fill: text-dark)
        #item.at("label")
      ],
      table.cell()[
        #set text(size: 9pt, fill: text-dark)
        #let val = item.at("value")
        #let note = item.at("note", default: none)
        #val
        #if note != none [
          #h(0.4em)
          #text(size: 8pt, fill: text-muted)[(#note)]
        ]
      ]
    )).flatten()
  )
}

#let status-pill(status) = {
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

  text(size: 8pt, fill: fg)[
    #label
  ]
}

#let progress-bar(val, label: none) = {
  let bar-color = if val >= 98 { green }
    else if val >= 90 { amber }
    else { red }
  let w = val / 100
  grid(
    columns: (1fr, auto),
    gutter: 6pt,
    align: horizon,
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
    ],
    text(size: 7.5pt, weight: "bold", fill: bar-color)[#str(calc.round(val, digits: 1))%],
  )
  if label != none {
    v(0.15em)
    text(size: 7pt, fill: text-muted)[#label]
  }
}

#let callout-box(body) = {
  block(
    fill: rgb("#fff3e0"),
    inset: (x: 12pt, y: 10pt),
    radius: 4pt,
    stroke: 0.5pt + rgb("#ffcc80"),
  )[#body]
}

#let section-title(title) = {
  block(above: 1em, below: 0.4em)[
    #text(size: 10.5pt, weight: "bold")[#title]
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
        fill: rgb("#fff3e0"),
        inset: (x: 6pt, y: 4pt),
      )[
        #set text(size: 7.5pt, weight: "bold", fill: amber)
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
  if iso == none or iso == "" { "—" } else { iso.split("T").at(0) }
}

#let page-header(title) = context {
  if counter(page).get().first() == 1 {
    set text(size: 8.5pt, fill: rgb("#555555"))
    grid(
      columns: (1.5fr, 2fr, 1.5fr),
      align: (left + horizon, center + horizon, right + horizon),
      gutter: 10pt,
      grid(
        columns: (auto, auto),
        gutter: 6pt,
        align: horizon,
        image("coreDevLogo.png", width: 20pt),
        [
          #text(weight: "bold", size: 9pt, fill: rgb("#222222"))[coreDev Solutions] \
          #text(size: 7.5pt, fill: rgb("#777777"))[Cebu City, Cebu]
        ],
      ),
      [#text(weight: "bold", size: 9.5pt, fill: rgb("#111111"))[#title]],
      [#text(size: 8pt, fill: rgb("#666666"))[*Date:* #datetime.today().display("[month repr:long] [day], [year]")]],
    )
    v(4pt)
    line(length: 100%, stroke: 0.5pt + rgb("#dddddd"))
  } else {
    set text(size: 8pt, fill: rgb("#888888"))
    h(1fr)
    title + " — continued"
    h(1fr)
    v(-0.8em)
    line(length: 100%, stroke: 0.3pt + rgb("#dddddd"))
  }
}
