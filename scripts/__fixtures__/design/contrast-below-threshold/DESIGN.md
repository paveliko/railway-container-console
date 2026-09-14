---
version: alpha
name: Fixture
colors:
  ink: "#111418"
  muted: "#5b6672"
  line: "#dfe3e8"
  lineStrong: "#7e8895"
  surface: "#ffffff"
  accent: "#2f6feb"
typography:
  md:
    fontFamily: &sans ui-sans-serif, system-ui, sans-serif
    fontSize: 15px
rounded:
  sm: 4px
spacing:
  xs: 4px
implementation:
  note: fixture
  typography:
    mono: ui-monospace, monospace
    weight:
      regular: 400
      medium: 500
      bold: 600
  border:
    hairline: 1px
  focus:
    width: 2px
    offset: 2px
    color: accent
  state:
    disabledAlpha: 0.55
    tintAlpha: 0.1
  spinner:
    size:
      sm: 16px
    stroke: 2px
  motion:
    spin: 0.9s
  components:
    probe:
      variants: [only]
      states: [default]
      grounds: [surface]
grid:
  step: 4
  applies: [spacing, rounded, spinner.size]
  exempt: {}
contrast:
  method:
    space: srgb
    composite: srgb-8bit
    round: 2
    tolerance: 0.01
  wcag:
    text: 4.5
    textLarge: 3.0
    boundary: 3.0
    indicator: 3.0
  house: {}
  checks:
    - { id: probe/only/default/label, usage: text, size: md, fg: { color: line }, bg: [{ color: surface }], ratio: 1.29 }
---

# Fixture

Deliberately wrong. Used by `check-design.mjs --self-test`.
