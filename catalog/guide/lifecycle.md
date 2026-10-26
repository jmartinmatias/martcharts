# `lifecycle` chart

Stage swimlanes: one row per item on a shared date axis, each stage drawn from its date to the next in a deepening tint of one hue, a tick at every stage date, and the last reached stage running on faintly while its next date is unknown. A today line, a status pill at the row's end, and an impact that sets the row's thickness. For where each regulation stands, from proposal to application.

## What it is for

- Schedules and plans: best
- Change between two points: good
- Exact values and lookup: possible

**Best for**

- Where each regulation stands: proposed, adopted, in force, applies
- What applies next, and how long since adoption
- Any multi-stage process with dates per stage: deals, hiring, product launches

**Least useful for**

- One start and one end per row (use timeline)
- Stages with no dates (use funnel or table)
- More than about 30 rows (filter, or facet by group)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One row per data row on a shared date axis: from each stage's date to the next a segment in a deepening tint, a tick at every date, a faint run from the last known stage to the edge when the next date is missing, a today line, and a status pill at the end; impact sets the row's thickness.

**Rows it reads well with**: 1 to 30.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each row. |
| `stages` | date (one or more) | yes | Date fields in lifecycle order, such as proposed, adopted, inForce, applies. A later date may be missing: the row then runs on from its last known stage. |
| `group` | category |  | Field that gathers rows under a heading, such as topic. |
| `status` | category |  | Field written as a small pill at the row's end, such as In force or Consultation. |
| `impact` | number |  | Field from 1 to 5 that sets each row's thickness: the higher the impact, the thicker the row. |

## This example's columns (19 columns, 12 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `name` (Regulation) | category | `label` | 12 different, e.g. "DORA", "CRR3", "AMLR" |
| `proposed` (Proposed) | date | `stages` | 9 different, e.g. "2020-09-24", "2021-10-27", "2021-07-20" |
| `adopted` (Adopted) | date | `stages` | 10 different, e.g. "2022-11-28", "2024-05-31", "2024-06-13" |
| `inForce` (In force) | date | `stages` | 8 different, e.g. "2023-01-16", "2024-07-09", "2024-08-01" |
| `applies` (Applies) | date | `stages` | 9 different, e.g. "2025-01-17", "2025-01-01", "2027-07-10" |
| `topic` (Topic) | category | `group` | 9 different, e.g. "Operational resilience", "Prudential", "AML & sanctions" |
| `status` (Status) | category | `status` | 4 different, e.g. "Applies", "In force", "Adopted" |
| `impact` (Impact) | number | `impact` | 2 to 5 |
| `id` | category | not drawn | 12 different, e.g. "dora", "crr3", "amlr" |
| `fullName` | category | not drawn | 12 different, e.g. "Digital Operational Resilience Act", "Capital Requirements Regulation III", "Anti-Money Laundering Regulation" |
| `jurisdiction` | category | not drawn | 1 different, e.g. "EU" |
| `issuer` | category | not drawn | 2 different, e.g. "European Parliament and Council", "European Commission" |
| `pressure` | number | not drawn | 31 to 88 |
| `provisions` | number | not drawn | 48 to 412 |
| `mandatory` | number | not drawn | 39 to 351 |
| `recommended` | number | not drawn | 5 to 89 |
| `optional` | number | not drawn | 2 to 46 |
| `pages` | number | not drawn | 23 to 420 |
| `mustComply` | number | not drawn | 1 to 5 |

## The data drawing it now

| name | proposed | adopted | inForce | applies | topic | status | impact | id | fullName | jurisdiction | issuer | pressure | provisions | mandatory | recommended | optional | pages | mustComply |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DORA | 2020-09-24 | 2022-11-28 | 2023-01-16 | 2025-01-17 | Operational resilience | Applies | 5 | dora | Digital Operational Resilience Act | EU | European Parliament and Council | 82 | 312 | 221 | 58 | 33 | 79 | 5 |
| CRR3 | 2021-10-27 | 2024-05-31 | 2024-07-09 | 2025-01-01 | Prudential | Applies | 5 | crr3 | Capital Requirements Regulation III | EU | European Parliament and Council | 79 | 412 | 351 | 38 | 23 | 420 | 1 |
| AMLR | 2021-07-20 | 2024-05-31 | 2024-07-09 | 2027-07-10 | AML & sanctions | In force | 5 | amlr | Anti-Money Laundering Regulation | EU | European Parliament and Council | 88 | 356 | 289 | 41 | 26 | 180 | 5 |
| AI Act | 2021-04-21 | 2024-06-13 | 2024-08-01 | 2026-08-02 | AI & digital | In force | 4 | ai-act | Artificial Intelligence Act | EU | European Parliament and Council | 74 | 376 | 241 | 89 | 46 | 144 | 4 |
| MiCA | 2020-09-24 | 2023-05-31 | 2023-06-29 | 2024-12-30 | Markets | Applies | 4 | mica | Markets in Crypto-Assets Regulation | EU | European Parliament and Council | 68 | 288 | 196 | 60 | 32 | 150 | 3 |
| EMIR 3 | 2022-12-07 | 2024-11-19 | 2024-12-24 | 2025-06-24 | Markets | Applies | 3 | emir3 | European Market Infrastructure Regulation review | EU | European Parliament and Council | 42 | 121 | 84 | 22 | 15 | 60 | 3 |
| CSRD | 2021-04-21 | 2022-12-14 | 2023-01-05 | 2024-01-01 | ESG & sustainability | Applies | 4 | csrd | Corporate Sustainability Reporting Directive | EU | European Parliament and Council | 61 | 142 | 97 | 31 | 14 | 45 | 3 |
| Instant Payments | 2022-10-26 | 2024-02-26 | 2024-04-08 | 2025-01-09 | Payments | Applies | 3 | ipr | Instant Payments Regulation | EU | European Parliament and Council | 48 | 48 | 41 | 5 | 2 | 23 | 2 |
| PSD3 | 2023-06-28 | 2026-03-18 |  |  | Payments | Adopted | 4 | psd3 | Third Payment Services Directive | EU | European Parliament and Council | 57 | 198 | 130 | 44 | 24 | 92 | 2 |
| CCD2 | 2021-06-30 | 2023-10-18 | 2023-11-19 | 2026-11-20 | Consumer protection | In force | 3 | ccd2 | Consumer Credit Directive II | EU | European Parliament and Council | 46 | 97 | 68 | 19 | 10 | 46 | 2 |
| FiDA | 2023-06-28 |  |  |  | Data & privacy | Consultation | 4 | fida | Financial Data Access Regulation | EU | European Commission | 53 | 118 | 76 | 30 | 12 | 61 | 4 |
| GDPR procedural rules | 2023-07-04 | 2026-02-10 |  |  | Data & privacy | Adopted | 2 | gdpr-procedural | Regulation on procedural rules for GDPR enforcement | EU | European Parliament and Council | 31 | 54 | 39 | 10 | 5 | 30 | 5 |

As CSV:

```csv
name,proposed,adopted,inForce,applies,topic,status,impact,id,fullName,jurisdiction,issuer,pressure,provisions,mandatory,recommended,optional,pages,mustComply
DORA,2020-09-24,2022-11-28,2023-01-16,2025-01-17,Operational resilience,Applies,5,dora,Digital Operational Resilience Act,EU,European Parliament and Council,82,312,221,58,33,79,5
CRR3,2021-10-27,2024-05-31,2024-07-09,2025-01-01,Prudential,Applies,5,crr3,Capital Requirements Regulation III,EU,European Parliament and Council,79,412,351,38,23,420,1
AMLR,2021-07-20,2024-05-31,2024-07-09,2027-07-10,AML & sanctions,In force,5,amlr,Anti-Money Laundering Regulation,EU,European Parliament and Council,88,356,289,41,26,180,5
AI Act,2021-04-21,2024-06-13,2024-08-01,2026-08-02,AI & digital,In force,4,ai-act,Artificial Intelligence Act,EU,European Parliament and Council,74,376,241,89,46,144,4
MiCA,2020-09-24,2023-05-31,2023-06-29,2024-12-30,Markets,Applies,4,mica,Markets in Crypto-Assets Regulation,EU,European Parliament and Council,68,288,196,60,32,150,3
EMIR 3,2022-12-07,2024-11-19,2024-12-24,2025-06-24,Markets,Applies,3,emir3,European Market Infrastructure Regulation review,EU,European Parliament and Council,42,121,84,22,15,60,3
CSRD,2021-04-21,2022-12-14,2023-01-05,2024-01-01,ESG & sustainability,Applies,4,csrd,Corporate Sustainability Reporting Directive,EU,European Parliament and Council,61,142,97,31,14,45,3
Instant Payments,2022-10-26,2024-02-26,2024-04-08,2025-01-09,Payments,Applies,3,ipr,Instant Payments Regulation,EU,European Parliament and Council,48,48,41,5,2,23,2
PSD3,2023-06-28,2026-03-18,,,Payments,Adopted,4,psd3,Third Payment Services Directive,EU,European Parliament and Council,57,198,130,44,24,92,2
CCD2,2021-06-30,2023-10-18,2023-11-19,2026-11-20,Consumer protection,In force,3,ccd2,Consumer Credit Directive II,EU,European Parliament and Council,46,97,68,19,10,46,2
FiDA,2023-06-28,,,,Data & privacy,Consultation,4,fida,Financial Data Access Regulation,EU,European Commission,53,118,76,30,12,61,4
GDPR procedural rules,2023-07-04,2026-02-10,,,Data & privacy,Adopted,2,gdpr-procedural,Regulation on procedural rules for GDPR enforcement,EU,European Parliament and Council,31,54,39,10,5,30,5
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "regulation-lifecycle",
  "title": "Where each regulation stands",
  "subtitle": "From proposal to application, by topic",
  "description": "Every regulation in the compliance book as a lane on one date axis: proposed, adopted, in force and applies, each stage in a deeper tint, the stage still running drawn faintly, today marked, the current status at the end and thicker lanes for higher impact.",
  "note": "Fictional dates; not legal advice",
  "source": {
    "name": "Regulatory watch register"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "id": "dora",
        "name": "DORA",
        "fullName": "Digital Operational Resilience Act",
        "topic": "Operational resilience",
        "jurisdiction": "EU",
        "issuer": "European Parliament and Council",
        "status": "Applies",
        "proposed": "2020-09-24",
        "adopted": "2022-11-28",
        "inForce": "2023-01-16",
        "applies": "2025-01-17",
        "impact": 5,
        "pressure": 82,
        "provisions": 312,
        "mandatory": 221,
        "recommended": 58,
        "optional": 33,
        "pages": 79,
        "mustComply": 5
      },
      {
        "id": "crr3",
        "name": "CRR3",
        "fullName": "Capital Requirements Regulation III",
        "topic": "Prudential",
        "jurisdiction": "EU",
        "issuer": "European Parliament and Council",
        "status": "Applies",
        "proposed": "2021-10-27",
        "adopted": "2024-05-31",
        "inForce": "2024-07-09",
        "applies": "2025-01-01",
        "impact": 5,
        "pressure": 79,
        "provisions": 412,
        "mandatory": 351,
        "recommended": 38,
        "optional": 23,
        "pages": 420,
        "mustComply": 1
      },
      {
        "id": "amlr",
        "name": "AMLR",
        "fullName": "Anti-Money Laundering Regulation",
        "topic": "AML & sanctions",
        "jurisdiction": "EU",
        "issuer": "European Parliament and Council",
        "status": "In force",
        "proposed": "2021-07-20",
        "adopted": "2024-05-31",
        "inForce": "2024-07-09",
        "applies": "2027-07-10",
        "impact": 5,
        "pressure": 88,
        "provisions": 356,
        "mandatory": 289,
        "recommended": 41,
        "optional": 26,
        "pages": 180,
        "mustComply": 5
      }
    ]
  },
  "fields": {
    "name": {
      "label": "Regulation"
    },
    "proposed": {
      "label": "Proposed"
    },
    "adopted": {
      "label": "Adopted"
    },
    "inForce": {
      "label": "In force"
    },
    "applies": {
      "label": "Applies"
    },
    "status": {
      "label": "Status"
    },
    "impact": {
      "label": "Impact"
    },
    "topic": {
      "label": "Topic"
    }
  },
  "view": {
    "type": "lifecycle",
    "label": "name",
    "stages": [
      "proposed",
      "adopted",
      "inForce",
      "applies"
    ],
    "group": "topic",
    "status": "status",
    "impact": "impact",
    "today": "2026-10-25"
  },
  "i18n": {
    "fr": {
      "title": "Où en est chaque réglementation",
      "subtitle": "De la proposition à l'application, par thème",
      "description": "Chaque réglementation du registre en couloir sur un axe de dates : proposée, adoptée, en vigueur et applicable, chaque étape plus foncée, l'étape en cours en pâle, aujourd'hui marqué, le statut à la fin et des couloirs plus épais pour les plus fort impact.",
      "note": "Dates fictives ; pas un avis juridique",
      "source": {
        "name": "Registre de veille réglementaire"
      },
      "fields": {
        "name": {
          "label": "Réglementation"
        },
        "proposed": {
          "label": "Proposé"
        },
        "adopted": {
          "label": "Adopté"
        },
        "inForce": {
          "label": "En vigueur"
        },
        "applies": {
          "label": "Applicable"
        },
        "status": {
          "label": "Statut"
        },
        "topic": {
          "label": "Thème"
        }
      }
    },
    "de": {
      "title": "Wo jede Regulierung steht",
      "subtitle": "Vom Vorschlag zur Anwendung, nach Thema",
      "description": "Jede Regulierung im Compliance-Register als Bahn auf einer Datumsachse: vorgeschlagen, angenommen, in Kraft und anwendbar, jede Phase dunkler, die laufende Phase blass, heute markiert, der aktuelle Status am Ende und dickere Bahnen für höhere Wirkung.",
      "note": "Fiktive Daten; keine Rechtsberatung",
      "source": {
        "name": "Register der Regulierungsbeobachtung"
      },
      "fields": {
        "name": {
          "label": "Regulierung"
        },
        "proposed": {
          "label": "Vorgeschlagen"
        },
        "adopted": {
          "label": "Angenommen"
        },
        "inForce": {
          "label": "In Kraft"
        },
        "applies": {
          "label": "Anwendbar"
        },
        "impact": {
          "label": "Wirkung"
        },
        "topic": {
          "label": "Thema"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `history` | fits | better | Better for exact values and lookup, and still good for schedules and plans. | `{"type":"history","date":"proposed","title":"name","group":"topic"}` |
| `timeline` | fits | same | Keeps the job (schedules and plans) with a different look. Simpler, one bar from start to end; the stages in between are gone. | `{"type":"timeline","label":"name","start":"proposed","group":"topic"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up schedules and plans. | `{"type":"bar","x":"name","y":["impact","pressure"]}` |
| `board` | fits | different | Answers a different question: better for conversion through ordered steps and exact values and lookup, but gives up schedules and plans. | `{"type":"board","label":"name","stage":"topic","group":"topic"}` |
| `bump` | fits | different | Answers a different question: better for ranking, top to bottom and trend over time, but gives up schedules and plans. | `{"type":"bump","x":"proposed","series":"name","value":"impact"}` |
| `hbar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up schedules and plans. | `{"type":"hbar","label":"name","value":["impact","pressure"]}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up schedules and plans. | `{"type":"icicle","levels":["name","topic"],"value":"impact"}` |
| `list` | fits | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up schedules and plans. | `{"type":"list","label":"name"}` |
| `matrix` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle and comparing amounts across categories, but gives up schedules and plans. | `{"type":"matrix","x":"name","y":"topic","label":"name"}` |
| `strips` | fits | different | Answers a different question: better for how each group or period splits and comparing amounts across categories, but gives up schedules and plans. | `{"type":"strips","label":"name","value":["impact","pressure"]}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up schedules and plans. | `{"type":"sunburst","levels":["name","topic"],"value":"impact"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up schedules and plans. | `{"type":"treemap","label":"name","value":"impact","group":"topic"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up schedules and plans. | `{"type":"heatmap","x":"name","y":"topic","value":"impact"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up schedules and plans. | `{"type":"kpi","value":"impact"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up schedules and plans. | `{"type":"sankey","source":"name","target":"topic","value":"impact"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up schedules and plans. | `{"type":"scatter","x":"impact","y":"pressure","label":"name"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up schedules and plans. | `{"type":"table"}` |
| `beeswarm` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"impact","group":"topic","label":"name"}` |
| `dot` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"dot","label":"name","value":["impact","pressure"]}` |
| `kpis` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"impact"},{"value":"pressure"},{"value":"provisions"}]}` |
| `marimekko` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"marimekko","x":"name","series":"topic","value":"impact"}` |
| `pareto` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"pareto","label":"name","value":"impact"}` |
| `radar` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"radar","label":"name","y":["impact","pressure"]}` |
| `rose` | fits | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"rose","label":"name","y":["impact","pressure"]}` |
| `area` | stretch: "proposed" repeats (9 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | different | Answers a different question: better for trend over time and how each group or period splits, but gives up schedules and plans. | `{"type":"area","x":"proposed","y":["impact","pressure"]}` |
| `dual` | stretch: "proposed" repeats (9 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | different | Answers a different question: better for trend over time and how two measures relate, but gives up schedules and plans. | `{"type":"dual","x":"proposed","y":"impact","y2":"pressure"}` |
| `horizon` | stretch: "proposed" repeats (9 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | different | Answers a different question: better for trend over time and comparing amounts across categories, but gives up schedules and plans. | `{"type":"horizon","x":"proposed","y":["impact","pressure"]}` |
| `line` | stretch: "proposed" repeats (9 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | different | Answers a different question: better for trend over time and comparing amounts across categories, but gives up schedules and plans. | `{"type":"line","x":"proposed","y":["impact","pressure"]}` |
| `boxplot` | stretch: 12 rows: this chart says little with fewer than 15. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"boxplot","value":"impact","group":"topic"}` |
| `calendar` | stretch: "proposed" repeats (9 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. 12 rows: this chart says little with fewer than 28. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"calendar","date":"proposed","value":"impact"}` |
| `donut` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"donut","label":"name","value":"impact"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 12 rows. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"gauge","value":"impact"}` |
| `histogram` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"histogram","value":"impact"}` |
| `pie` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"pie","label":"name","value":"impact"}` |
| `ridgeline` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"impact","group":"name"}` |
| `waffle` | stretch: 12 rows: this chart crowds past about 5. | worse | Gives up schedules and plans, and this data gives it nothing better to do. | `{"type":"waffle","label":"name","value":"impact"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `bullet` (It needs a target, plan or budget column.); `candlestick` (It needs open, high, low and close prices per period.); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `rings` (It needs a target, plan or budget column.); `slope` (It needs the same measure at two points in time, in two columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
