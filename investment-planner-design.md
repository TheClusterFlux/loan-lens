Investment Planner: Design Doc

Goals

- Enable dynamic investment planning with flexible contribution schedules
- Visualize portfolio growth over time with contributions vs growth
- Allow easy edits to payment options at different times (recurring and one-time)
- Provide an Adjust for Inflation toggle to view values in real (today’s) dollars

References and inspiration

- Retirement/investment tools commonly support variable contributions, inflation toggles, and scenario comparisons (e.g., Flexible Retirement Planner, Quicken Lifetime Planner, Portfolio Visualizer).
- Best practices:
  - Clear schedule editor for contributions (recurring and one-time)
  - Inflation-adjusted views presented via a toggle
  - Charts that separate contributions from growth for intuition

Feature scope (v1)

- Inputs
  - Initial investment
  - Expected annual return (%)
  - Inflation rate (%)
  - Projection length (years)
  - Adjust for inflation (toggle)
- Contribution rules
  - Recurring: amount, frequency (monthly/quarterly/annual), start month, optional end month, label
  - One-time: amount, event month, label
  - Add/remove rules; rules apply starting next month (month 1)
- Visualization
  - Chart.js line chart of portfolio value over time
  - Optional second line for cumulative contributions to show “how much came from you vs growth”
  - When “Adjust for inflation” is toggled, values are displayed in real dollars by dividing by cumulative inflation factor
- Results
  - Ending portfolio value (nominal or real based on toggle)
  - Total contributions (nominal and real)
  - Total growth (nominal and real)

Math model

- Monthly return r = (annualReturn / 100) / 12
- Monthly inflation i = (inflationRate / 100) / 12
- For month m (0-indexed), track:
  - contributions[m] = sum of rule contributions applicable to month m+1
  - portfolio = (portfolio + contributions[m]) × (1 + r)
  - cumulativeInflationFactor[m] = (1 + i)^(m)
- Real values are computed as value / cumulativeInflationFactor[m]
- Cumulative contributions tracked separately, with optional real-adjusted view

Usability notes

- Form to add/edit rules should be fast: minimal inputs and defaults
- Display rules in a list with concise labels and remove buttons
- Use immediate feedback: recalc and update chart on every change
- Keep copy and styling aligned with existing pages

Testing plan

- Local smoke test
  - Start static server and load investment-planner.html
  - Enter initial values and add multiple rules (monthly and one-time)
  - Toggle Adjust for inflation and confirm values/lines rescale
  - Sanity check: zero return produces straight-line growth matching contributions
- Edge cases
  - No rules: portfolio grows only from initial investment
  - Zero return: ending value equals initial + total contributions
  - High inflation: real series noticeably lower than nominal

Out of scope (future)

- Multiple scenarios and comparisons
- Biweekly or custom day-based frequencies
- Taxes, fees, and asset allocation modeling

