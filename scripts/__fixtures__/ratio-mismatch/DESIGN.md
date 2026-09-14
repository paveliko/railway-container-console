---
designmd: 1
tokens:
  colors:
    ink: "#111418"
    muted: "#5b6672"
    line: "#dfe3e8"
    lineStrong: "#7e8895"
    surface: "#ffffff"
    accent: "#2f6feb"
  spacing:
    xs: 4px
  radius:
    sm: 4px
  spinner:
    size:
      sm: 16px
grid:
  step: 4
  applies: [spacing, radius, spinner.size]
  exempt: {}
components:
  probe:
    variants: [only]
    states: [default]
contrast:
  method:
    space: srgb
    composite: unquantised
    round: 2
    tolerance: 0.01
  wcag:
    text: 4.5
    textLarge: 3.0
    boundary: 3.0
    indicator: 3.0
  house: {}
  checks:
    - { id: probe/only/default/label, usage: text, size: md, fg: { color: ink }, bg: [{ color: surface }], ratio: 9.99 }
---

# Fixture

Deliberately wrong. Used by `check-design.mjs --self-test`.
