# `hbar` chart

Horizontal bars for rankings and long labels: label on the left, bar, value at the end. Sort the rows first for a ranking. Several value fields draw grouped bars, one thin bar per field in each row; stacked joins them into one bar per row, and split gives each field its own column of bars.

## What it is for

- Ranking, top to bottom: best
- Comparing amounts across categories: best
- Exact values and lookup: possible
- Actual against target or plan: possible

**Best for**

- Rankings with long names: top features, top customers, causes
- Up to about 30 categories, readable on a phone
- Two or three measures per row, side by side, stacked, or split into columns when their units differ

**Least useful for**

- Time order (use bar or line)
- Share of one whole (use donut or waffle)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One horizontal bar per row, label on the left and value at the end, sorted as given or by value. Several value fields draw one thin bar each per row, stacked into one bar with stacked (percent for shares), or in one column per field with split.

**Rows it reads well with**: 2 to 30.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each bar. |
| `value` | number (one or more) | yes | Field or fields with each bar's amount. Bars start at zero. Several fields draw one bar per field in each row (grouped), stacked into one bar with stacked, or in separate columns with split. |

## This example's columns (2 columns, 10 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `feature` (Feature) | category | `label` | 10 different, e.g. "Dashboards", "Exports", "Alerts" |
| `share` (Accounts using it) | number | `value` | 0.22 to 0.91 |

## The data drawing it now

| feature | share |
| --- | --- |
| Dashboards | 0.91 |
| Exports | 0.84 |
| Alerts | 0.78 |
| Sharing | 0.74 |
| Scheduled reports | 0.66 |
| API access | 0.52 |
| Custom fields | 0.47 |
| Forecasting | 0.38 |
| SSO | 0.31 |
| Audit log | 0.22 |

As CSV:

```csv
feature,share
Dashboards,0.91
Exports,0.84
Alerts,0.78
Sharing,0.74
Scheduled reports,0.66
API access,0.52
Custom fields,0.47
Forecasting,0.38
SSO,0.31
Audit log,0.22
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "feature-adoption",
  "title": "Feature adoption",
  "subtitle": "Share of active accounts using each one, September 2026",
  "description": "Which features active accounts actually use. Dashboards lead at 91%; Forecasting, SSO and the audit log reach fewer than two in five accounts.",
  "source": {
    "name": "Product analytics"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "feature": "Dashboards",
        "share": 0.91
      },
      {
        "feature": "Exports",
        "share": 0.84
      },
      {
        "feature": "Alerts",
        "share": 0.78
      }
    ]
  },
  "fields": {
    "feature": {
      "label": "Feature"
    },
    "share": {
      "label": "Accounts using it",
      "format": {
        "type": "percent",
        "decimals": 0
      }
    }
  },
  "view": {
    "type": "hbar",
    "label": "feature",
    "value": "share",
    "mark": "lollipop"
  },
  "i18n": {
    "fr": {
      "title": "Adoption des fonctions",
      "subtitle": "Part des comptes actifs utilisant chacune, septembre 2026",
      "description": "Les fonctions réellement utilisées par les comptes actifs. Les tableaux de bord mènent à 91 % ; Prévision, SSO et journal d'audit touchent moins de deux comptes sur cinq.",
      "source": {
        "name": "Analyse produit"
      },
      "fields": {
        "feature": {
          "label": "Fonction",
          "values": {
            "Dashboards": "Tableaux de bord",
            "Exports": "Exports",
            "Alerts": "Alertes",
            "Sharing": "Partage",
            "Scheduled reports": "Rapports planifiés",
            "API access": "Accès API",
            "Custom fields": "Champs personnalisés",
            "Forecasting": "Prévisions",
            "Audit log": "Journal d'audit"
          }
        },
        "share": {
          "label": "Comptes utilisateurs"
        }
      }
    },
    "de": {
      "title": "Funktionsnutzung",
      "subtitle": "Anteil aktiver Konten, die sie nutzen, September 2026",
      "description": "Welche Funktionen aktive Konten wirklich nutzen. Dashboards führen mit 91 %; Prognose, SSO und Audit-Log erreichen weniger als zwei von fünf Konten.",
      "source": {
        "name": "Produktanalyse"
      },
      "fields": {
        "feature": {
          "label": "Funktion",
          "values": {
            "Dashboards": "Dashboards",
            "Exports": "Exporte",
            "Alerts": "Warnungen",
            "Sharing": "Teilen",
            "Scheduled reports": "Geplante Berichte",
            "API access": "API-Zugang",
            "Custom fields": "Benutzerdefinierte Felder",
            "Forecasting": "Prognosen",
            "Audit log": "Prüfprotokoll"
          }
        },
        "share": {
          "label": "Nutzende Konten"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `bar` | fits | trade-off | Better for trend over time and how each group or period splits; weaker for ranking, top to bottom. Same comparison; only better when the categories are in time order or the labels are short. | `{"type":"bar","x":"feature","y":"share"}` |
| `pareto` | fits | different | Answers a different question: better for what drives or moves a total and share of one whole, but gives up comparing amounts across categories. Adds the running total, so the few items behind most of the total stand out. | `{"type":"pareto","label":"feature","value":"share"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up comparing amounts across categories and ranking, top to bottom. | `{"type":"treemap","label":"feature","value":"share"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories. Names and exact values come first and sizes are gone; good for a phone or a top-five card. | `{"type":"list","label":"feature","value":"share"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories and ranking, top to bottom. | `{"type":"table"}` |
| `beeswarm` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"share","label":"feature"}` |
| `dot` | fits | worse | Weaker for ranking, top to bottom, with nothing gained for this data. Far less ink and a tighter axis, so small differences show; the length from zero is gone. | `{"type":"dot","label":"feature","value":"share"}` |
| `icicle` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"icicle","levels":"feature","value":"share"}` |
| `kpi` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"kpi","value":"share"}` |
| `kpis` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"share"}]}` |
| `radar` | fits | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"radar","label":"feature","y":"share"}` |
| `rose` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"rose","label":"feature","y":"share"}` |
| `sunburst` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"feature","value":"share"}` |
| `area` | stretch: x expects dates; "feature" is text, so its rows are drawn in the order given. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"area","x":"feature","y":"share"}` |
| `boxplot` | stretch: 10 rows: this chart says little with fewer than 15. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"boxplot","value":"share"}` |
| `donut` | stretch: 10 rows: this chart crowds past about 6. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. Shows the parts as one whole; only worth it with two to six parts. | `{"type":"donut","label":"feature","value":"share"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 10 rows. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"gauge","value":"share"}` |
| `histogram` | stretch: 10 rows: this chart says little with fewer than 20. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"histogram","value":"share"}` |
| `horizon` | stretch: x expects dates; "feature" is text, so its rows are drawn in the order given. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"horizon","x":"feature","y":"share"}` |
| `line` | stretch: x expects dates; "feature" is text, so its rows are drawn in the order given. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"line","x":"feature","y":"share"}` |
| `pie` | stretch: 10 rows: this chart crowds past about 6. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. Shows the parts as one whole; only worth it with two to six parts. | `{"type":"pie","label":"feature","value":"share"}` |
| `ridgeline` | stretch: 10 rows: this chart says little with fewer than 20. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"share","group":"feature"}` |
| `waffle` | stretch: 10 rows: this chart crowds past about 5. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"waffle","label":"feature","value":"share"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "feature", already the x)); `board` (needs a separate column for stage (it would reuse "feature", already the label)); `bullet` (needs a separate column for target (it would reuse "share", already the value)); `bump` (needs a separate column for series (it would reuse "feature", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "share", already the open)); `chord` (needs a separate column for target (it would reuse "feature", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "share", already the y)); `dumbbell` (needs a separate column for to (it would reuse "share", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "feature", already the x)); `history` (needs a separate column for title (it would reuse "feature", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "feature", already the x)); `matrix` (needs a separate column for y (it would reuse "feature", already the x)); `meter` (needs a separate column for target (it would reuse "share", already the value)); `pyramid` (needs a separate column for right (it would reuse "share", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "feature", already the label)); `rings` (needs a separate column for target (it would reuse "share", already the value)); `sankey` (needs a separate column for target (it would reuse "feature", already the source)); `scatter` (needs a separate column for y (it would reuse "share", already the x)); `slope` (needs a separate column for to (it would reuse "share", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "share", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "feature", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
