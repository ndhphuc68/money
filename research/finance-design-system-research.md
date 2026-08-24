# Research: personal finance app UI foundations

## Findings

- Use charts to communicate a small number of important insights, not to display every available data point. Apple recommends common chart types, progressive disclosure for detail, and accessible descriptions for chart elements. Source: [Apple Human Interface Guidelines — Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data).
- Charts need a visual hierarchy where data is more prominent than supporting labels, axes, and descriptions. This supports a dashboard that leads with balance, spending trend, and budget status. Source: [Apple Human Interface Guidelines — Charts](https://developer.apple.com/design/human-interface-guidelines/charts).
- Text and text-in-image should meet at least a 4.5:1 contrast ratio for normal-sized text under WCAG AA. Source: [W3C WCAG — Contrast (Minimum)](https://www.w3.org/WAI/WCAG20/versions/guidelines/wcag20-guidelines-20081211-a4.pdf).
- The eventual React Native system should expose semantic color roles rather than raw colors: primary action, surface, text, positive, warning, negative, and informational states. This keeps light/dark themes and accessibility adjustments manageable.

## Design implication for the prototype

All three variants keep the same information model so the choice isolates visual direction. The next design-system pass should retain the strongest hierarchy from the selected variant, then formalize tokens for color, typography, spacing, radius, elevation, chart series, and transaction states.
