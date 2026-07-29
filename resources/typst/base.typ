// base.typ — Shared styles, functions, and page configuration
// All report templates import this file

#let d = json("input.json")

// Page configuration
#set page(
  paper: d.at("paper", default: "a4"),
  flipped: d.at("orientation", default: "landscape") == "landscape",
  margin: (x: 20mm, y: 25mm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(size: 9pt, fill: gray)
      #h(1fr) CoreDev Server Monitoring #h(1fr)
    ]
  },
)

// Typography
#set text(font: "DejaVu Sans", size: 10pt, fill: black)
#set par(justify: true)

// Colors
#let brand-color = rgb("#1f2937")
#let header-bg = rgb("#f9fafb")
#let border-color = rgb("#d1d5db")
#let text-muted = rgb("#6b7280")
#let green = rgb("#16a34a")
#let red = rgb("#dc2626")
#let yellow = rgb("#ca8a04")

// Layout functions
#let report-layout(body) = {
  body
}

#let section-heading(title) = {
  block(above: 1.2em, below: 0.5em)[
    #text(size: 11pt, weight: "semibold", fill: brand-color)[#title]
  ]
}

#let kv-table(fields) = {
  table(
    columns: (1fr, 1fr),
    stroke: 0.5pt + border-color,
    inset: 8pt,
    ..fields.map(f => (
      table.cell(fill: header-bg)[
        #text(weight: "medium", fill: text-muted)[#f.at("label")]
      ],
      [#f.at("value")],
    )).flatten()
  )
}

#let data-table(headers: (), rows: ()) = {
  table(
    columns: headers.len(),
    stroke: 0.5pt + border-color,
    inset: 8pt,
    table.header(
      ..headers.map(h => table.cell(fill: header-bg)[
        #text(weight: "medium", fill: text-muted)[#h]
      ])
    ),
    ..rows.map(row => (
      ..row.map(cell => [#cell])
    )).flatten()
  )
}

#let status-text(status) = {
  if status == "online" {
    text(fill: green, weight: "medium")[#status]
  } else if status == "offline" {
    text(fill: red, weight: "medium")[#status]
  } else {
    [#status]
  }
}

#let pct(value) = {
  [#str(value)%]
}

#let format-bytes(bytes) = {
  if bytes > 1073741824 {
    [#str(calc.round(bytes / 1073741824, digits: 1)) GB]
  } else if bytes > 1048576 {
    [#str(calc.round(bytes / 1048576, digits: 1)) MB]
  } else if bytes > 1024 {
    [#str(calc.round(bytes / 1024, digits: 1)) KB]
  } else {
    [#str(bytes) B]
  }
}
