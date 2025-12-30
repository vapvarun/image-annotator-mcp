# Image Annotator MCP Server

Add markers, arrows, circles, and labels to screenshots. Designed to work alongside Playwright MCP for documentation workflows.

## Tools

### `annotate_screenshot`
Add multiple annotations to a screenshot image.

**Annotation Types:**
- `marker` - Numbered circles (1, 2, 3...)
- `arrow` - Straight arrows
- `curved-arrow` - Curved arrows
- `circle` - Circle highlights
- `rect/box` - Rectangle highlights
- `label/text` - Text labels (with optional background)
- `highlight` - Semi-transparent overlays
- `blur` - Blur sensitive areas

**Colors:** red, orange, yellow, green, blue, purple, pink, white, black (or hex codes)

### `get_image_dimensions`
Get width/height of an image for coordinate calculation.

### `create_step_guide`
Quick step-by-step guide creation with numbered markers and labels.

### `highlight_element`
Simple highlight (circle/rectangle) for a specific area.

## Usage Example

```json
{
  "input_path": "/path/to/screenshot.png",
  "annotations": [
    {"type": "marker", "x": 100, "y": 100, "number": 1, "color": "red"},
    {"type": "arrow", "from": [120, 100], "to": [200, 150], "color": "red"},
    {"type": "label", "x": 210, "y": 155, "text": "Click here!", "background": "white"}
  ]
}
```

## Workflow with Playwright

1. Take screenshot with Playwright: `browser_take_screenshot`
2. Get dimensions: `get_image_dimensions`
3. Add annotations: `annotate_screenshot`
4. Upload to Basecamp: `basecamp_comment_with_file`

## CLI Usage

```bash
node annotate.js input.png output.png --annotations '[...]'
```
