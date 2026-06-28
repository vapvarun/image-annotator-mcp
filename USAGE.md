# Usage Guide — Image Annotator MCP

A task-oriented cookbook. For the full parameter reference, see [README.md](README.md).

Every recipe is a JSON payload you pass to a tool (`annotate_screenshot` unless noted). All coordinates are in **image pixels** — read [the coordinate model](README.md#coordinate-model-read-this-first) first.

---

## Contents

1. [Find the right coordinates](#1-find-the-right-coordinates)
2. [Numbered steps that don't cover the UI](#2-numbered-steps-that-dont-cover-the-ui)
3. [Spotlight a single feature](#3-spotlight-a-single-feature)
4. [A framed hero screenshot](#4-a-framed-hero-screenshot)
5. [Call out a detail](#5-call-out-a-detail)
6. [Outline / highlight a region](#6-outline--highlight-a-region)
7. [Blur sensitive data](#7-blur-sensitive-data)
8. [Optimized output for docs sites](#8-optimized-output-for-docs-sites)
9. [Quick one-liners](#9-quick-one-liners)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Find the right coordinates

Before annotating, get the real pixel size:

```json
// get_image_dimensions
{ "image_path": "/path/to/screenshot.png" }
// → { "width": 3450, "height": 1760, "format": "png" }
```

If you captured with Playwright, measure the element's center and multiply by the device pixel ratio (usually 2 on retina). See the [Playwright workflow](README.md#workflow-with-playwright-mcp).

Rule of thumb: **point `target` at the element's center**, and let markers/spotlights offset themselves.

---

## 2. Numbered steps that don't cover the UI

The most common doc need. Give each marker a `target` (the element) and an `offset` (where the badge sits). The badge lands in clear space and draws a leader line back to the element.

```json
{
  "input_path": "/path/to/screenshot.png",
  "theme": "documentation",
  "annotations": [
    {"type": "marker", "number": 1, "target": [1010, 627], "offset": [-80, -110]},
    {"type": "marker", "number": 2, "target": [800, 802],  "offset": [-90,  90]},
    {"type": "marker", "number": 3, "target": [1230, 802], "offset": [80,  -90]}
  ]
}
```

- `offset` is `[dx, dy]` from the target. Negative `dy` = above, negative `dx` = left.
- Set `"leader": false` on a marker to drop the connecting line.
- Prefer this over placing markers directly on `x`/`y` — that buries the thing you're documenting.

For a fully automatic version (markers + text labels + connectors), use `create_step_guide`:

```json
// create_step_guide
{
  "input_path": "/path/to/screenshot.png",
  "steps": [
    {"x": 1010, "y": 627, "label": "Open the Library tab"},
    {"x": 800,  "y": 802, "label": "Search your references"},
    {"x": 1490, "y": 802, "label": "Apply a filter"}
  ]
}
```

---

## 3. Spotlight a single feature

Dim everything except one area. Put the `spotlight` **first** so markers/callouts render on top of the dimmed layer.

```json
{
  "input_path": "/path/to/screenshot.png",
  "theme": "documentation",
  "annotations": [
    {"type": "spotlight", "target": [1010, 627], "width": 1700, "height": 120, "dim": 0.6},
    {"type": "callout", "x": 1010, "y": 430, "text": "Everything starts here", "pointer": "bottom"}
  ]
}
```

- `shape`: `rect` (default), `ellipse`, or `circle`.
- `dim`: `0`–`1` darkness of the dimmed area (`0.6` is a good start).
- `feather`: edge softness (default `10`; raise for a softer glow).
- For a round spotlight on an icon: `{"type": "spotlight", "target": [x, y], "shape": "circle", "radius": 60}`.

---

## 4. A framed hero screenshot

Wrap the whole thing in browser chrome with a drop shadow — the "floating screenshot" look. Combine with a spotlight for a landing-page-grade figure.

```json
{
  "input_path": "/path/to/screenshot.png",
  "theme": "documentation",
  "frame": { "browserBar": true, "padding": 90, "background": "#E9EDF2" },
  "downscale": 0.6,
  "annotations": [
    {"type": "spotlight", "target": [1010, 627], "width": 1700, "height": 120, "dim": 0.62},
    {"type": "marker", "number": 1, "target": [1010, 627], "offset": [-80, -110]},
    {"type": "callout", "x": 1010, "y": 430, "text": "Open the Library tab", "pointer": "bottom", "color": "primary"}
  ]
}
```

To frame a screenshot you already annotated (or a raw one) without re-annotating, use `frame_screenshot`:

```json
// frame_screenshot
{ "input_path": "/path/to/screenshot.png", "browser_bar": true, "format": "webp", "downscale": 0.6 }
```

> Note the casing: `annotate_screenshot` uses `frame: { browserBar: true }` (camelCase); `frame_screenshot` uses `browser_bar` (snake_case).

---

## 5. Call out a detail

A callout is a speech bubble; the `pointer` is the side the tail comes from.

```json
{
  "input_path": "/path/to/screenshot.png",
  "annotations": [
    {"type": "callout", "x": 640, "y": 470, "text": "Type a keyword,\nthen press Filter", "pointer": "top", "color": "primary"}
  ]
}
```

- `\n` makes multi-line callouts.
- For a plain text label instead of a bubble, use `label`. With no `background`, it gets a white halo so it stays readable over busy pixels:
  `{"type": "label", "x": 640, "y": 900, "text": "Search box", "color": "darkGray"}`

---

## 6. Outline / highlight a region

Ring a group of controls, or wash a color over them.

```json
{
  "input_path": "/path/to/screenshot.png",
  "annotations": [
    {"type": "rect", "x": 1000, "y": 760, "width": 960, "height": 95, "color": "warning", "style": "dashed"},
    {"type": "highlight", "x": 1000, "y": 760, "width": 960, "height": 95, "color": "yellow", "opacity": 0.25}
  ]
}
```

Or the one-liner `highlight_area`:

```json
// highlight_area
{ "input_path": "/path/to/screenshot.png", "shape": "rect", "x": 1000, "y": 760, "width": 960, "height": 95, "color": "warning", "label": "Filters" }
```

> `rect`/`circle`/`highlight` `width`/`height`/`radius` are in **image pixels and never auto-scale** — they describe the region. Only the outline thickness scales.

---

## 7. Blur sensitive data

Hide emails, keys, or customer data before publishing.

```json
// blur_area
{ "input_path": "/path/to/screenshot.png", "x": 1500, "y": 60, "width": 360, "height": 44, "intensity": 12 }
```

Or as part of a larger composition: `{"type": "blur", "x": 1500, "y": 60, "width": 360, "height": 44, "intensity": 12}`.

---

## 8. Optimized output for docs sites

Ship light, crisp images. A 2x capture downscaled to ~1.2x stays sharp at half the file size.

```json
{
  "input_path": "/path/to/screenshot.png",
  "annotations": [ /* ... */ ],
  "format": "webp",
  "quality": 82,
  "downscale": 0.6
}
```

- `format`: `webp` (best for docs), `jpeg` (photos, no transparency), `png` (default, lossless).
- `quality`: 80–85 is usually indistinguishable from lossless for UI screenshots.
- `downscale`: `0.5` for a true 2x→1x; `0.6`–`0.7` keeps a little extra crispness.
- If you set `format` without an `output_path`, the extension is fixed automatically.

---

## 9. Quick one-liners

When you don't need a full composition:

| Goal | Tool | Minimal call |
|---|---|---|
| Ring one area | `highlight_area` | `{ input_path, shape: "rect", x, y, width }` |
| One callout | `add_callout` | `{ input_path, x, y, text }` |
| Hide data | `blur_area` | `{ input_path, x, y, width, height }` |
| Frame only | `frame_screenshot` | `{ input_path, browser_bar: true }` |
| Numbered steps | `create_step_guide` | `{ input_path, steps: [{x, y, label}] }` |

---

## 10. Troubleshooting

**Annotations look tiny.** The image is probably retina (2x). Sizing auto-scales by width, but if you passed explicit `size`/`fontSize`/`strokeWidth` they're used as-is — raise them, or pass a higher `scale`.

**A marker/callout is cut off at the edge.** Add a `margin` (e.g. `60`) so the canvas expands and the gutter has room. Set `matte` for the padding color.

**Text isn't the font I expect.** Output uses the host's `system-ui` (SF Pro on macOS, Segoe UI on Windows, Roboto on Linux). On a server with no UI fonts, install a sans family (e.g. `fonts-roboto`) so librsvg can resolve it.

**Spotlight dims the marker too.** Put the `spotlight` object **first** in the `annotations` array — everything after it renders on top.

**Colors look off in JPEG.** JPEG has no transparency; the matte is flattened to white. Use `png` or `webp` if you need transparency.

**Coordinates are wrong.** Re-check with `get_image_dimensions` and remember the 2x retina factor — DOM coordinates are half the image pixels.
