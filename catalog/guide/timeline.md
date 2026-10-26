# `timeline` chart

A Gantt-style timeline: one row per task with a bar from its start to its end date, a diamond for milestones (no end), month ticks along the top and an optional today line. For project plans, launches and contracts.

## What it is for

- Schedules and plans: best

**Best for**

- Project plans, launch phases and milestones
- What is late or running now

**Least useful for**

- Quantities (use bar)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One row per task with a bar from start to end, a diamond where there is no end (a milestone), grouped and with a today line.

**Rows it reads well with**: 1 to 40.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each task. |
| `start` | date | yes | Field with each task's start date, as YYYY-MM-DD or a timestamp. |
| `end` | date |  | Field with each task's end date. A row without one is drawn as a milestone. |
| `group` | category |  | Field that colors tasks by team or phase, up to 8 groups. |
| `progress` | number |  | Field with each task's share done, from 0 to 1 (values above 1 are read as percentages). Fills the bar that far and labels it after the bar. |

## This example's columns (5 columns, 8 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `task` | category | `label` | 8 different, e.g. "Customer research", "Design system", "Prototype" |
| `start` | date | `start` | 8 different, e.g. "2026-08-03", "2026-08-24", "2026-09-07" |
| `end` | date | `end` | 7 different, e.g. "2026-08-28", "2026-09-25", "2026-10-02" |
| `phase` (Phase) | category | `group` | 4 different, e.g. "Discovery", "Design", "Build" |
| `done` | number | `progress` | 0 to 1 |

## The data drawing it now

| task | start | end | phase | done |
| --- | --- | --- | --- | --- |
| Customer research | 2026-08-03 | 2026-08-28 | Discovery | 1 |
| Design system | 2026-08-24 | 2026-09-25 | Design | 1 |
| Prototype | 2026-09-07 | 2026-10-02 | Design | 1 |
| Platform build | 2026-09-21 | 2026-11-13 | Build | 0.55 |
| Integrations | 2026-10-05 | 2026-11-20 | Build | 0.3 |
| Private beta | 2026-11-09 | 2026-11-27 | Launch | 0 |
| Launch day | 2026-11-30 |  | Launch |  |
| Marketing push | 2026-11-16 | 2026-12-18 | Launch | 0 |

As CSV:

```csv
task,start,end,phase,done
Customer research,2026-08-03,2026-08-28,Discovery,1
Design system,2026-08-24,2026-09-25,Design,1
Prototype,2026-09-07,2026-10-02,Design,1
Platform build,2026-09-21,2026-11-13,Build,0.55
Integrations,2026-10-05,2026-11-20,Build,0.3
Private beta,2026-11-09,2026-11-27,Launch,0
Launch day,2026-11-30,,Launch,
Marketing push,2026-11-16,2026-12-18,Launch,0
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "launch-plan",
  "title": "Q4 launch plan",
  "subtitle": "Discovery to go-live, August to December 2026",
  "description": "Each workstream's dates by phase, filled to its share done, with the launch-day milestone and a line at today.",
  "source": {
    "name": "Project office"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "task": "Customer research",
        "phase": "Discovery",
        "start": "2026-08-03",
        "end": "2026-08-28",
        "done": 1
      },
      {
        "task": "Design system",
        "phase": "Design",
        "start": "2026-08-24",
        "end": "2026-09-25",
        "done": 1
      },
      {
        "task": "Prototype",
        "phase": "Design",
        "start": "2026-09-07",
        "end": "2026-10-02",
        "done": 1
      }
    ]
  },
  "fields": {
    "phase": {
      "label": "Phase"
    },
    "task": {}
  },
  "view": {
    "type": "timeline",
    "label": "task",
    "start": "start",
    "end": "end",
    "group": "phase",
    "today": true,
    "progress": "done"
  },
  "i18n": {
    "fr": {
      "title": "Plan de lancement T4",
      "subtitle": "De la découverte à la mise en service, août à décembre 2026",
      "description": "Les dates de chaque chantier par phase, remplies selon l'avancement, avec le jalon du lancement et une ligne à aujourd'hui.",
      "source": {
        "name": "Bureau de projet"
      },
      "fields": {
        "task": {
          "values": {
            "Customer research": "Recherche client",
            "Design system": "Système de design",
            "Prototype": "Prototype",
            "Platform build": "Construction de la plateforme",
            "Integrations": "Intégrations",
            "Private beta": "Bêta privée",
            "Launch day": "Jour du lancement",
            "Marketing push": "Campagne marketing"
          }
        },
        "phase": {
          "values": {
            "Discovery": "Découverte",
            "Design": "Conception",
            "Build": "Réalisation",
            "Launch": "Lancement"
          }
        }
      }
    },
    "de": {
      "title": "Q4-Launchplan",
      "subtitle": "Von der Analyse zum Go-live, August bis Dezember 2026",
      "description": "Die Termine jedes Arbeitspakets nach Phase, nach Fortschritt gefüllt, mit dem Launch-Meilenstein und einer Linie für heute.",
      "source": {
        "name": "Projektbüro"
      },
      "fields": {
        "task": {
          "values": {
            "Customer research": "Kundenforschung",
            "Design system": "Designsystem",
            "Prototype": "Prototyp",
            "Platform build": "Plattformaufbau",
            "Integrations": "Integrationen",
            "Private beta": "Private Beta",
            "Launch day": "Starttag",
            "Marketing push": "Marketingoffensive"
          }
        },
        "phase": {
          "values": {
            "Discovery": "Erkundung",
            "Design": "Design",
            "Build": "Umsetzung",
            "Launch": "Start"
          }
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `history` | fits | better | Better for exact values and lookup, and still good for schedules and plans. Reads as a story, newest first, with notes and amounts; durations are lost. | `{"type":"history","date":"start","title":"task","group":"phase"}` |
| `lifecycle` | fits | better | Better for change between two points, and still good for schedules and plans. Shows every stage between start and end, each in its own tint, with a status and a thickness for impact; needs a date per stage. | `{"type":"lifecycle","label":"task","stages":["start","end"],"group":"phase"}` |
| `area` | fits | different | Answers a different question: better for trend over time and how each group or period splits, but gives up schedules and plans. | `{"type":"area","x":"start","y":"done"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up schedules and plans. | `{"type":"bar","x":"task","y":"done"}` |
| `board` | fits | different | Answers a different question: better for exact values and lookup and conversion through ordered steps, but gives up schedules and plans. | `{"type":"board","label":"task","stage":"phase","group":"phase"}` |
| `bump` | fits | different | Answers a different question: better for ranking, top to bottom and trend over time, but gives up schedules and plans. | `{"type":"bump","x":"start","series":"task","value":"done"}` |
| `hbar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up schedules and plans. | `{"type":"hbar","label":"task","value":"done"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up schedules and plans. | `{"type":"icicle","levels":["task","phase"],"value":"done"}` |
| `line` | fits | different | Answers a different question: better for trend over time and comparing amounts across categories, but gives up schedules and plans. | `{"type":"line","x":"start","y":"done"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up schedules and plans. | `{"type":"list","label":"task"}` |
| `marimekko` | fits | different | Answers a different question: better for how each group or period splits and comparing amounts across categories, but gives up schedules and plans. | `{"type":"marimekko","x":"task","series":"phase","value":"done"}` |
| `matrix` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle and comparing amounts across categories, but gives up schedules and plans. | `{"type":"matrix","x":"task","y":"phase","label":"task"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up schedules and plans. | `{"type":"sunburst","levels":["task","phase"],"value":"done"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up schedules and plans. | `{"type":"treemap","label":"task","value":"done","group":"phase"}` |
| `funnel` | fits | different | Answers a different question: better for conversion through ordered steps, but gives up schedules and plans. | `{"type":"funnel","label":"task","value":"done"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up schedules and plans. | `{"type":"heatmap","x":"task","y":"phase","value":"done"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up schedules and plans. | `{"type":"kpi","value":"done"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up schedules and plans. | `{"type":"sankey","source":"task","target":"phase","value":"done"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up schedules and plans. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"dot","label":"task","value":"done"}` |
| `kpis` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"done"}]}` |
| `pareto` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"pareto","label":"task","value":"done"}` |
| `radar` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"radar","label":"task","y":"done"}` |
| `rose` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"rose","label":"task","y":"done"}` |
| `beeswarm` | stretch: 8 rows: this chart says little with fewer than 10. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"done","group":"phase","label":"task"}` |
| `boxplot` | stretch: 8 rows: this chart says little with fewer than 15. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"boxplot","value":"done","group":"phase"}` |
| `calendar` | stretch: 8 rows: this chart says little with fewer than 28. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"calendar","date":"start","value":"done"}` |
| `donut` | stretch: 8 rows: this chart crowds past about 6. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"donut","label":"task","value":"done"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 8 rows. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"gauge","value":"done"}` |
| `histogram` | stretch: 8 rows: this chart says little with fewer than 20. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"histogram","value":"done"}` |
| `horizon` | stretch: 8 rows: this chart says little with fewer than 10. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"horizon","x":"start","y":"done"}` |
| `pie` | stretch: 8 rows: this chart crowds past about 6. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"pie","label":"task","value":"done"}` |
| `ridgeline` | stretch: 8 rows: this chart says little with fewer than 20. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"done","group":"task"}` |
| `waffle` | stretch: 8 rows: this chart crowds past about 5. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"waffle","label":"task","value":"done"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `bullet` (needs a separate column for target (it would reuse "done", already the value)); `candlestick` (needs a separate column for high (it would reuse "done", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "done", already the y)); `dumbbell` (needs a separate column for to (it would reuse "done", already the from)); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (needs a separate column for target (it would reuse "done", already the value)); `pyramid` (needs a separate column for right (it would reuse "done", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `rings` (needs a separate column for target (it would reuse "done", already the value)); `scatter` (needs a separate column for y (it would reuse "done", already the x)); `slope` (needs a separate column for to (it would reuse "done", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `variance` (needs a separate column for target (it would reuse "done", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
