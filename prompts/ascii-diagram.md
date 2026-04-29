---
description: Render concepts, architectures, control flow, and state as text-first visual diagrams using prose, spacing, unicode glyphs, and shape vocabulary.
---

# Text-First Visual Diagramming

You are rendering ideas as pictures made of text. No images. No mermaid. No external tools.
The target is a terminal/markdown viewer with a monospace font. Spacing, glyphs, and alignment ARE the rendering engine.

Treat every diagram as a **semantic choice**, not decoration. The shape should encode the idea.

---

## 1. First decide: diagram or prose?

Draw only when one of these is true:

- there are **≥3 things with relationships** (flow, containment, comparison, transitions),
- the reader needs to see **order, direction, or branching** at a glance,
- you are explaining **control flow, state, layering, or failure paths**,
- you are contrasting **before vs after**, **me vs system**, **expected vs actual**.

Do NOT draw when:

- a single sentence conveys it,
- the content is a flat list (use bullets),
- it is a data table (use a markdown table),
- the diagram would just be labeled rectangles pointing at each other with no added meaning.

> If removing the diagram loses nothing, the diagram was noise.

---

## 2. The character palette (semantic, not decorative)

Each glyph has a job. Use it for that job only. Consistency is what makes text diagrams readable.

### Flow and connection

```
 │ ─      primary flow, strong connection
 ┃ ━      emphasized flow (rare; use sparingly)
 ╱ ╲      branching or divergence
 ▼ ▲      direction of flow (down / up)
 ◀ ▶      direction of flow (left / right)
 ↑ ↓ ← →  inline arrow inside prose
 ⇢ ⇠      soft/optional flow
 ⇒        implication / "therefore"
 ↪ ↩      resume / return / loopback
```

### Corners and joins (box-drawing)

```
 ┌ ┐ └ ┘    sharp corners — systems, components, modules
 ╭ ╮ ╰ ╯    soft corners — state, ephemeral, human-readable
 ├ ┤ ┬ ┴ ┼  joins; only when two flows actually meet
```

Pick ONE corner style per diagram. Mixing sharp + soft in the same picture reads as a mistake.

### Emphasis and state

```
 ░  very light — hidden / disabled / not-yet
 ▒  light     — partial / degraded
 ▓  medium    — in-progress / warming
 █  full      — active / ready / visible
```

That progression is a free visual scale. Use it for readiness, health, fill level, bar charts, tier emphasis.

### Separators

```
 ───   logical break inside a diagram
 ━━━   section break between diagrams
 ═══   top/bottom banner of a report-style block
 ···   elision ("more of the same")
```

### Markers

```
 •   bullet / small node
 ◦   sub-node / secondary
 ▪   strong node (avoid overusing)
 ◀   "this is the point"
 ←   annotation arrow pointing to the thing being annotated
```

Inline annotation pattern:

```
    some_field = ready       ← what the user actually sees
```

Not:

```
    some_field = ready  // comment
```

The `←` is a visual anchor. It reads faster than code comments inside a diagram.

---

## 3. Shape vocabulary — pick the shape that matches the idea

Different ideas want different shapes. This is the core skill.

### 3.1 Linear flow (A → B → C)

Use when causation or ordering is the entire point.

```
   request ──▶ parse ──▶ validate ──▶ dispatch ──▶ response
```

Rules:
- one arrow style per diagram
- align tokens on a single baseline
- spaces around arrows, not jammed

### 3.2 Branching flow (decision / outcomes)

```
                     ┌──▶ ok path        : return result
   input ──▶ check ──┤
                     └──▶ failure path   : surface error
```

- vertical bar `│` carries the trunk
- `├` and `└` branch off
- align the colons if you add labels; alignment is the grid

### 3.3 Pipeline with states between stages

```
   raw ─▶ parsed ─▶ normalized ─▶ indexed ─▶ ready
    ░       ▒           ▓            █          ✓
```

The second row is the readiness scale. Reader gets state + order at once.

### 3.4 Layered / stack diagram

Use for systems where layer N sits on top of layer N-1.

```
   ┌ UI / dashboard ──────────────────────┐
   │ API (stateless ingress)              │
   │ sandbox / dispatch                   │
   │ MCP client pool                      │
   │ upstream MCP servers                 │
   └──────────────────────────────────────┘
```

A stack is **read top-down** = top is user-facing, bottom is infra.
If you need the opposite meaning, say so explicitly in the caption.

### 3.5 Side-by-side comparison (before / after, me / system)

```
   CURRENT                          CORRECT
   ─────────                        ─────────
   installed  ─▶ hidden             installed  ─▶ visible
   no token   ─▶ "missing"          no token   ─▶ "reconnect"
   expired    ─▶ reconnect loop     expired    ─▶ auto-refresh
```

- same column widths on both sides
- identical row order
- dashes separate header from body

### 3.6 State machine

```
      install
         │
         ▼
     installed ──────────── refresh ───────────┐
         │                                     │
     no auth?                                  │
         │yes                                  │
         ▼                                     │
    needs_creds ──▶ connect ──▶ discovering ──▶ ready
                                                │
                                       token expired
                                                │
                                                ▼
                                         requires_oauth
                                                │
                                                ▼
                                             connect
                                                │
                                                └──▶ ready
```

- each state is a noun
- each transition is a verb
- transitions flow downward by default; loops go right and come back left

### 3.7 Containment (what lives inside what)

```
   ╭ workspace ────────────────────────────────╮
   │                                            │
   │  ┌ plugin source ──────────────────────┐  │
   │  │  tools                              │  │
   │  │  credentials (per user)             │  │
   │  │  oauth tokens (per user)            │  │
   │  └─────────────────────────────────────┘  │
   │                                            │
   ╰────────────────────────────────────────────╯
```

Containment diagrams are the right tool when **scope/tenancy/ownership** is the point.

### 3.8 Bars and scales (emphasis without numbers)

```
   installed   ████████████████████████
   warm        ████████████░░░░░░░░░░░░
   usable      ██████░░░░░░░░░░░░░░░░░░
   runnable    ███░░░░░░░░░░░░░░░░░░░░░
```

- equal bar widths
- label column padded so bars start at the same column
- light `░` for "not yet", solid `█` for "yes"
- never mix bar length with decorative ASCII

### 3.9 Annotated callout (labeling a real thing)

```
        canonical key:
        workspace_id + source_id + credential_fp
                         │
                         ▼
            ╭ SourceSessionDO ╮
            │  warm MCP owner │
            ╰─────────────────╯
```

- the arrow is pointing at the thing
- the thing being annotated is below/after the arrow, never above/before

### 3.10 Timeline

```
   t=0    t=1           t=2              t=3
    │      │             │                │
    ▼      ▼             ▼                ▼
   install connect   token expires    reconnect
```

Timelines are horizontal. Vertical timelines read like state machines; do not mix them.

---

## 4. Spacing and alignment rules

These are non-negotiable. Misalignment makes text diagrams feel broken.

1. **One diagram uses one grid.** If arrows start at column 12 in one row, they start at column 12 in every row of that diagram.
2. **Pad with spaces, never tabs.** Tabs render differently everywhere.
3. **Always leave a blank line before and after a diagram block.** No touching prose.
4. **Code fence every diagram.** Use triple backticks so the monospace grid is preserved.
5. **Left-align the diagram to the prose margin,** unless you are centering a small motif on purpose (rare).
6. **Arrow gaps:** `──▶`, not `-->` or `-->`. Use box-drawing glyphs, not hyphens, for arrow shafts.
7. **Consistent arrow length** within a diagram. Don't have one `──▶` next to one `────▶` unless length encodes meaning.
8. **Annotations with `←` live to the right of the thing they describe,** preceded by at least two spaces:
   ```
       status = ready       ← this is what the runnable gate checks
   ```

---

## 5. Glyph pitfalls (they look fine, they render badly)

Some characters are tempting but unreliable:

- **Emoji inside diagrams.** Variable-width. Breaks alignment. Use sparingly, and never inside a grid — only at the left-most column of a bullet list.
- **Combining accents (`é`, `ñ`).** Render as 1 or 2 cells depending on terminal. Avoid inside grids.
- **Fullwidth punctuation (`：`, `／`).** Takes 2 cells. Looks like a typo.
- **CJK characters.** 2-cell. Same problem.
- **Zero-width joiners / variation selectors.** Silently break alignment. Never paste from a rich-text source.
- **Non-breaking space (U+00A0).** Looks like a normal space, copies as one, aligns as one, but some renderers treat it differently. When alignment suddenly breaks, suspect this.

Safe default set: ASCII + box-drawing (`U+2500..U+257F`) + block elements (`U+2580..U+259F`) + arrows (`U+2190..U+21FF`) + a handful of geometric shapes (`U+25A0..U+25FF`).

---

## 6. Decision guide — which shape for which idea

| The idea you want to show           | Use                           |
|-------------------------------------|-------------------------------|
| Ordering / causation                | linear flow (3.1)             |
| Yes/no branches                     | branching flow (3.2)          |
| Stages with changing status         | pipeline with states (3.3)    |
| Layered system                      | stack (3.4)                   |
| Before vs after                     | side-by-side (3.5)            |
| Status transitions over time        | state machine (3.6)           |
| Scope / tenancy / ownership         | containment (3.7)             |
| Relative emphasis without numbers   | bar scale (3.8)               |
| Point at a specific part            | annotated callout (3.9)       |
| Sequence of events over real time   | timeline (3.10)               |

If two shapes fit, prefer the simpler one.

---

## 7. Composition rules

When a single picture is not enough, use a **sequence of small diagrams**, each doing one job, separated by prose.

Recommended rhythm:

```
short sentence stating the claim

(diagram)

one-line caption under the diagram that reads like a conclusion, not a description
```

Avoid:

- one giant diagram trying to show 6 concepts
- multiple diagrams with no prose between them
- a diagram and a bullet list saying the same thing

Every diagram must earn its space. If the next diagram repeats what the last one already showed, delete one.

---

## 8. Thinking process (how to pick a diagram from scratch)

When you are about to explain something, do this silently:

1. **Name the concept in one noun phrase.** e.g. "state leak between installed and runnable".
2. **Ask what kind of thing it is:**
   - a process? → flow
   - a set of states? → state machine
   - a set of layers? → stack
   - a contrast? → side-by-side
   - a containment? → nested boxes
   - a quantity? → bars
3. **Pick the minimal shape that encodes that kind.**
4. **Sketch the skeleton with corners, lines, arrows first. Labels last.** This stops you from sizing a diagram around text.
5. **Check alignment.** Count columns if unsure.
6. **Write the one-line caption last.** The caption is the takeaway, not a description.

Useful inner dialogue:

- "What do I want the reader's eye to land on first?" → put that at top-left.
- "Where is the surprise?" → pull it out with `← ...` or a block of `█`.
- "Can a novice read this without the surrounding prose?" → if no, simplify shape or add one annotation.

---

## 9. Worked micro-examples

### Cause → effect, minimal

```
   A ──▶ B ──▶ C
```

### Cause → effect with a branch

```
   A ──▶ B ──┬──▶ C
             └──▶ D
```

### Layering a product

```
   ┌ user-facing UI            ┐
   │ API / ingress             │
   │ execution layer           │
   │ data plane (D1 / DO / R2) │
   └───────────────────────────┘
```

### Showing a gap between two states

```
   installed  ████████████████████████
   connected  ████████░░░░░░░░░░░░░░░░
                      ▲
                      │
                this is the gap users hit
```

### State transition

```
   idle ──▶ warming ──▶ ready ──▶ expired ──▶ warming ...
```

---

## 10. Do / don't summary

### Do

- let **shape carry meaning**
- keep **one arrow style, one corner style, one scale** per diagram
- use **`←` for annotation**, not comments or parentheses
- end each diagram with a **one-line conclusion**, not a description
- prefer **several small diagrams** to one giant one

### Don't

- mix ASCII `->` with unicode `──▶` in the same diagram
- use emoji inside grids
- pad with tabs
- draw boxes around plain text just to "make it a diagram"
- repeat in prose what the diagram already said

---

## 11. Final discipline

If you catch yourself drawing a box around a single label, stop. A label is just prose. A diagram only earns its place when it shows **relationship, flow, state, scope, or contrast** that prose cannot.

The goal is not "make it look technical". The goal is: **one glance, the idea lands.**
