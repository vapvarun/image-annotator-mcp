# Image Annotator MCP Server

Professional MCP server for annotating screenshots with markers, arrows, callouts, spotlights, and premium framing. Built for documentation, tutorials, and bug reports — works seamlessly with the Playwright MCP for an end-to-end "capture → annotate → ship" workflow.

![Example Annotation](examples/annotated.png?v=3)

- **Reference:** this README (all tools + parameters)
- **Cookbook:** [USAGE.md](USAGE.md) (step-by-step recipes)

---

## Features

- **12 annotation types** — markers, arrows, curved arrows, callouts, rectangles, circles, labels, highlights, blur, connectors, icons, and spotlight
- **Premium, doc-ready output by default** — clean professional font (no handwriting), retina auto-scaling, marker leader lines that never cover the UI, and text halos for legibility over busy screenshots
- **Spotlight focus** — dim the whole screenshot and softly highlight one area
- **Screenshot framing** — rounded browser chrome + drop shadow + matte padding
- **Output control** — PNG / WebP / JPEG, quality, and downscale for crisp, light web images
- **Theme support** — pre-built themes for documentation, tutorials, bug reports, and highlights
- **7 MCP tools** — from one-liners (`highlight_area`, `add_callout`) to full compositions (`annotate_screenshot`)

---

## What's new in 1.2.0 (premium quality)

These defaults make output look like a real product doc out of the box:

- **Clean font by default** — replaced the Comic Sans handwriting default with a professional `system-ui / SF Pro / Segoe UI / Roboto` stack. `handwriting` is now opt-in.
- **Retina auto-scale** — annotation sizes scale to the image resolution automatically (override with `scale`).
- **Non-covering markers** — give a marker a `target: [x, y]` and it sits in a clear area, drawing a leader line to the element instead of burying it.
- **`spotlight` type** — placed first, dims everything except a soft-edged focus area.
- **`frame`** — wraps the result in rounded browser chrome with a soft shadow.
- **`margin` / `matte`** — pad the canvas so edge callouts are never clipped.
- **`format` / `quality` / `downscale`** — emit optimized WebP/JPEG and downscale 2x captures.
- **New `frame_screenshot` tool** — frame a raw or already-annotated screenshot.

See [CHANGELOG](#changelog) for the full history.

---

## Installation

### Requirements

- **Node.js** >= 18
- **[sharp](https://sharp.pixelplumbing.com/)** (installed automatically) — handles image compositing and SVG rendering via librsvg

### Install dependencies

```bash
cd image-annotator-mcp
npm install
```

### Claude Code

```bash
claude mcp add image-annotator -- node /absolute/path/to/image-annotator-mcp/server.js
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "image-annotator": {
      "command": "node",
      "args": ["/absolute/path/to/image-annotator-mcp/server.js"]
    }
  }
}
```

> After updating the server, **restart Claude Code / Claude Desktop** so the new tool schema is loaded.

---

## Coordinate model (read this first)

- All `x` / `y` / `from` / `to` / `target` values are in **image pixel space** (the screenshot's actual pixels).
- A retina capture is typically **2x** its CSS size — a button at CSS `(505, 313)` is at pixel `(1010, 626)`. Use `get_image_dimensions` to confirm the real size, or multiply DOM coordinates by the device pixel ratio.
- **Decorative sizes** (marker size, stroke width, font size) **auto-scale** to the image width so they aren't tiny on retina captures. **Region sizes** (rect/circle/highlight/blur width, height, radius) and **coordinates** never scale — they describe the screenshot itself. Pass `scale: 1` to disable auto-scaling.

---

## MCP Tools

### `annotate_screenshot`

The main composition tool. Apply any number of annotations, optional theme, framing, and output settings.

| Param | Type | Default | Description |
|---|---|---|---|
| `input_path` | string | — | Absolute path to the input screenshot (**required**) |
| `annotations` | array | — | Array of annotation objects (**required**) — see [Annotation types](#annotation-types) |
| `output_path` | string | `<input>-annotated.png` | Where to write the result |
| `theme` | string | — | `documentation` \| `tutorial` \| `bugReport` \| `highlight` |
| `scale` | number | auto | Annotation size multiplier. Omit to auto-scale from image width; `1` = raw sizes |
| `margin` | number | `0` | Padding (px) added around the screenshot so gutter annotations aren't clipped |
| `matte` | string | `#FFFFFF` | Background color for the margin area |
| `frame` | object | — | Premium frame, e.g. `{ "browserBar": true }` — see [frame options](#frame-options) |
| `format` | string | `png` | `png` \| `webp` \| `jpeg` \| `jpg` (also inferred from `output_path`) |
| `quality` | number | `90` | Quality (1–100) for webp/jpeg |
| `downscale` | number | `1` | Resize factor for the final image, e.g. `0.5` halves a 2x capture |

### `get_image_dimensions`

Returns `{ width, height, format }`. Use this before annotating to compute coordinates.

| Param | Type | Description |
|---|---|---|
| `image_path` | string | Absolute path to the image (**required**) |

### `create_step_guide`

Drops numbered markers with labels and connecting lines in one call — ideal for tutorials.

| Param | Type | Default | Description |
|---|---|---|---|
| `input_path` | string | — | Input screenshot (**required**) |
| `steps` | array | — | `[{ x, y, label, color? }]` (**required**) |
| `connect_steps` | boolean | `true` | Draw dashed connectors between consecutive steps |
| `theme` | string | — | Optional theme |
| `output_path` | string | `<input>-guide.png` | Output path |

### `highlight_area`

One-liner to ring a region with a shape and optional label.

| Param | Type | Default | Description |
|---|---|---|---|
| `input_path` | string | — | **required** |
| `shape` | string | — | `circle` \| `rect` \| `highlight` (**required**) |
| `x`, `y` | number | — | Top-left of the region (**required**) |
| `width` | number | — | Width (or diameter for circle) (**required**) |
| `height` | number | `= width` | Height (rect only) |
| `color` | string | `red` | Outline color |
| `label` | string | — | Optional text label |
| `label_position` | string | `right` | `top` \| `bottom` \| `left` \| `right` |
| `output_path` | string | `<input>-highlighted.png` | Output path |

### `add_callout`

A speech-bubble callout pointing at a location.

| Param | Type | Default | Description |
|---|---|---|---|
| `input_path` | string | — | **required** |
| `x`, `y` | number | — | Point the pointer aims at (**required**) |
| `text` | string | — | Callout text (`\n` for newlines) (**required**) |
| `pointer` | string | `left` | `top` \| `bottom` \| `left` \| `right` |
| `color` | string | `primary` | Border color |
| `background` | string | `white` | Fill color |
| `output_path` | string | `<input>-callout.png` | Output path |

### `blur_area`

Blur a rectangle to hide sensitive data.

| Param | Type | Default | Description |
|---|---|---|---|
| `input_path` | string | — | **required** |
| `x`, `y`, `width`, `height` | number | — | Region to blur (**required**) |
| `intensity` | number | `8` | Blur strength |
| `output_path` | string | `<input>-blurred.png` | Output path |

### `frame_screenshot`

Wrap a raw or annotated screenshot in a premium frame.

| Param | Type | Default | Description |
|---|---|---|---|
| `input_path` | string | — | **required** |
| `browser_bar` | boolean | `false` | Add a browser title bar with traffic-light dots |
| `padding` | number | `64` | Padding around the screenshot |
| `background` | string | `#EEF1F5` | Matte color behind the frame |
| `radius` | number | `14` | Corner radius |
| `shadow` | boolean | `true` | Drop shadow |
| `format` | string | `png` | `png` \| `webp` \| `jpeg` \| `jpg` |
| `quality` | number | `90` | Quality 1–100 for webp/jpeg |
| `downscale` | number | `1` | Resize factor |
| `output_path` | string | `<input>-framed.png` | Output path |

---

## Annotation types

Each entry in `annotations[]` has a `type` plus type-specific fields.

| Type | Key fields | Notes |
|---|---|---|
| `marker` | `number`, `x`,`y` **or** `target`+`offset`, `color`, `size`, `style`, `leader` | Numbered badge. With `target`, sits in a clear area and draws a leader to the element. `style`: `filled` (default) \| `outline` \| `badge` |
| `arrow` | `from`,`to`, `color`, `strokeWidth`, `style` | `style`: `solid` \| `dashed` |
| `curved-arrow` | `from`,`to`, `curve`, `color`, `strokeWidth` | Bezier arrow; `curve` = bow amount |
| `callout` | `x`,`y`, `text`, `pointer`, `color`, `background` | Speech bubble; `text` supports `\n` |
| `rect` | `x`,`y`, `width`, `height`, `color`, `cornerRadius`, `style` | Outline box |
| `circle` | `x`,`y`, `radius`, `color`, `style` | Outline ring |
| `label` | `x`,`y`, `text`, `color`, `fontSize`, `background` | No `background` → white halo for legibility |
| `highlight` | `x`,`y`, `width`, `height`, `color`, `opacity` | Semi-transparent overlay |
| `blur` | `x`,`y`, `width`, `height`, `intensity` | Hide sensitive content |
| `connector` | `from`,`to`, `color`, `style` | Dashed line between elements |
| `icon` | `x`,`y`, `icon`, `color`, `size` | `icon`: `check` \| `x` \| `warning` \| `info` \| `question` |
| `spotlight` | `target` **or** `x`,`y`+`width`,`height`, `shape`, `dim`, `feather` | Place **first**. Dims everything but the focus area. `shape`: `rect` (default) \| `ellipse` \| `circle` |

### Frame options

Used by `annotate_screenshot`'s `frame` object (camelCase) and `frame_screenshot`'s top-level params (snake_case): `browserBar`/`browser_bar`, `padding`, `background`, `radius`, `shadow`.

### Themes

`documentation` (blue), `tutorial` (green), `bugReport` (red), `highlight` (amber). A theme sets default color/size/font for `marker`, `arrow`, `label`, and `callout`; per-annotation fields still override.

### Colors

Named: `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `cyan`, `teal`, `white`, `black`, `gray`, `lightGray`, `darkGray`, `success`, `warning`, `error`, `info`, `primary`, `secondary`, `accent`. Any hex value (`#1976D2`) also works.

---

## Quick examples

### Basic annotations

```json
{
  "input_path": "/path/to/screenshot.png",
  "theme": "documentation",
  "annotations": [
    {"type": "marker", "number": 1, "target": [1010, 627], "offset": [-80, -110]},
    {"type": "callout", "x": 300, "y": 200, "text": "Important!", "pointer": "left", "color": "orange"},
    {"type": "rect", "x": 50, "y": 250, "width": 200, "height": 100, "color": "green", "style": "dashed"},
    {"type": "icon", "x": 400, "y": 100, "icon": "check", "color": "success"}
  ]
}
```

### Premium: spotlight + frame + optimized output

```json
{
  "input_path": "/path/to/screenshot.png",
  "theme": "documentation",
  "frame": { "browserBar": true, "padding": 90, "background": "#E9EDF2" },
  "format": "webp",
  "downscale": 0.6,
  "annotations": [
    {"type": "spotlight", "target": [1010, 627], "width": 1700, "height": 120, "dim": 0.62},
    {"type": "marker", "number": 1, "target": [1010, 627], "offset": [-80, -110]},
    {"type": "callout", "x": 1010, "y": 430, "text": "Open the Library tab", "pointer": "bottom", "color": "primary"}
  ]
}
```

More recipes in **[USAGE.md](USAGE.md)**.

---

## Workflow with Playwright MCP

For pixel-accurate positions, drive Playwright to capture and measure, then annotate.

**1. Navigate & screenshot** — `browser_navigate` → `browser_take_screenshot`

**2. Measure the element** with `browser_evaluate`:

```javascript
() => {
  const el = document.querySelector('[role="tab"]');
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, dpr: window.devicePixelRatio };
}
```

**3. Convert to image pixels** — multiply by `dpr` (usually 2 on retina): `target = [x * dpr, y * dpr]`.

**4. Annotate** with `annotate_screenshot`, passing the measured `target`.

**5. Ship** — upload the result (e.g. Basecamp `comment_with_file`, or into your docs repo).

---

## CLI usage

The bundled CLI covers basic annotation (full options like `frame`/`margin`/`format` are MCP-only):

```bash
# Annotate
node annotate.js input.png output.png --annotations '[{"type":"marker","x":100,"y":100,"number":1}]' --theme documentation

# Show all annotation types and options
node annotate.js --help
```

`package.json` also exposes bins: `image-annotator` (the MCP server) and `annotate` (the CLI).

---

## Changelog

### 1.2.0
- Add `spotlight` annotation type (dim + soft focus hole)
- Add premium framing (`frame` option + `frame_screenshot` tool): rounded corners, drop shadow, matte padding, optional browser bar
- Add output control: `format` (png/webp/jpeg), `quality`, `downscale`

### 1.1.0
- Replace Comic Sans handwriting default with a clean professional font stack (handwriting now opt-in)
- Add marker `target`/`offset`/`leader` so badges point to the UI instead of covering it
- Auto-scale decorative sizes to image resolution (retina-aware)
- Add white text halo for legibility; add `margin`/`matte` canvas expansion to prevent edge clipping

### 1.0.0
- Initial release: markers, arrows, callouts, shapes, labels, highlights, blur, connectors, icons, themes

---

## License

MIT License — see [LICENSE](LICENSE).

## Author

Varun Dubey <varun@wbcomdesigns.com> · [github.com/vapvarun/image-annotator-mcp](https://github.com/vapvarun/image-annotator-mcp)
