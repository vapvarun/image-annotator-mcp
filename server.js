#!/usr/bin/env node

/**
 * Image Annotator MCP Server
 *
 * Professional screenshot annotation tool for creating documentation,
 * tutorials, and bug reports. Works alongside Playwright MCP.
 *
 * @author Varun Dubey
 * @license MIT
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const path = require('path');
const fs = require('fs');

// Import annotation functions
const sharp = require('sharp');
const { annotateImage, frameImage, getImageDimensions, computeScale, COLORS, THEMES } = require('./annotate.js');

// Tool definitions
const tools = [
  {
    name: 'annotate_screenshot',
    description: `Add professional annotations to a screenshot image.

Annotation types available:
• marker - Numbered circles (1, 2, 3...) with gradient and shadow
• arrow - Straight arrows with customizable heads
• curved-arrow - Smooth curved arrows
• callout - Text boxes with pointers (speech bubbles)
• rect - Rectangle highlights
• circle - Circle highlights
• label - Text labels with optional backgrounds
• highlight - Semi-transparent overlays
• blur - Blur sensitive content
• connector - Dashed lines between elements
• icon - Icon badges (check, x, warning, info, question)
• spotlight - Dim the whole screenshot and softly highlight one area (place FIRST)

Themes: documentation, tutorial, bugReport, highlight

Colors: red, orange, yellow, green, blue, purple, pink, cyan, teal,
        white, black, gray, lightGray, darkGray,
        success, warning, error, info, primary, secondary, accent

PREMIUM TIPS for clean docs:
• Markers auto-size to the screenshot resolution (retina-aware). Pass "scale" to override.
• To avoid covering the UI, give a marker a "target": [x,y] of the element and let it
  sit in a clear area — it draws a leader line to the target automatically.
• Set "margin" (e.g. 60) to pad the canvas so edge callouts/labels are never clipped.
• Add a "spotlight" annotation FIRST to dim everything but the focus area.
• Set "frame": { "browserBar": true } for a rounded browser chrome + drop shadow.
• "format": "webp" + "downscale": 0.6 give crisp, light images for docs sites.
• Text now uses a clean professional font by default (no handwriting).`,
    inputSchema: {
      type: 'object',
      properties: {
        input_path: {
          type: 'string',
          description: 'Absolute path to the input screenshot'
        },
        output_path: {
          type: 'string',
          description: 'Output path (optional, defaults to input-annotated.png)'
        },
        theme: {
          type: 'string',
          enum: ['documentation', 'tutorial', 'bugReport', 'highlight'],
          description: 'Apply a preset theme for consistent styling'
        },
        scale: {
          type: 'number',
          description: 'Annotation size multiplier. Omit to auto-scale from image width (retina-aware). Use 1 for raw sizes.'
        },
        margin: {
          type: 'number',
          description: 'Padding (px) added around the screenshot so gutter callouts/markers are not clipped. Default 0.'
        },
        matte: {
          type: 'string',
          description: 'Background color for the margin area (hex or color name). Default white.'
        },
        frame: {
          type: 'object',
          description: 'Wrap the result in a premium frame. Pass {} for defaults or customize.',
          properties: {
            browserBar: { type: 'boolean', description: 'Add a browser title bar with traffic-light dots' },
            padding: { type: 'number', description: 'Padding around the screenshot (default 64)' },
            background: { type: 'string', description: 'Matte color behind the frame (default #EEF1F5)' },
            radius: { type: 'number', description: 'Corner radius (default 14)' },
            shadow: { type: 'boolean', description: 'Drop shadow (default true)' }
          }
        },
        format: {
          type: 'string',
          enum: ['png', 'webp', 'jpeg', 'jpg'],
          description: 'Output format. Default png (or inferred from output_path extension).'
        },
        quality: {
          type: 'number',
          description: 'Quality (1-100) for webp/jpeg. Default 90.'
        },
        downscale: {
          type: 'number',
          description: 'Resize factor for the final image, e.g. 0.5 halves a 2x capture. Default 1 (no resize).'
        },
        annotations: {
          type: 'array',
          description: 'Array of annotation objects',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['marker', 'arrow', 'curved-arrow', 'callout', 'rect', 'circle', 'label', 'highlight', 'blur', 'connector', 'icon', 'spotlight'],
                description: 'Annotation type'
              },
              x: { type: 'number', description: 'X coordinate' },
              y: { type: 'number', description: 'Y coordinate' },
              number: { type: 'number', description: 'Number for markers' },
              text: { type: 'string', description: 'Text for labels/callouts' },
              from: { type: 'array', items: { type: 'number' }, description: '[x, y] start point' },
              to: { type: 'array', items: { type: 'number' }, description: '[x, y] end point' },
              target: { type: 'array', items: { type: 'number' }, description: 'Marker only: [x, y] of the UI element to point at. Marker offsets into a clear area and draws a leader to this point.' },
              offset: { type: 'array', items: { type: 'number' }, description: 'Marker only: [dx, dy] offset from target for the badge. Defaults to up-left.' },
              leader: { type: 'boolean', description: 'Marker only: draw a leader line from badge to target (default true).' },
              width: { type: 'number' },
              height: { type: 'number' },
              radius: { type: 'number' },
              color: { type: 'string' },
              background: { type: 'string' },
              size: { type: 'number' },
              fontSize: { type: 'number' },
              strokeWidth: { type: 'number' },
              style: { type: 'string', enum: ['filled', 'outline', 'badge', 'solid', 'dashed'] },
              pointer: { type: 'string', enum: ['top', 'bottom', 'left', 'right'] },
              icon: { type: 'string', enum: ['check', 'x', 'warning', 'info', 'question'] },
              shadow: { type: 'boolean' },
              curve: { type: 'number' },
              cornerRadius: { type: 'number' },
              opacity: { type: 'number' },
              shape: { type: 'string', enum: ['rect', 'ellipse', 'circle'], description: 'Spotlight only: hole shape (default rect)' },
              dim: { type: 'number', description: 'Spotlight only: darkness of the dimmed area 0-1 (default 0.6)' },
              feather: { type: 'number', description: 'Spotlight only: softness of the spotlight edge (default 10)' }
            },
            required: ['type']
          }
        }
      },
      required: ['input_path', 'annotations']
    }
  },
  {
    name: 'get_image_dimensions',
    description: 'Get width, height, and format of an image. Essential for calculating annotation coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        image_path: {
          type: 'string',
          description: 'Absolute path to the image'
        }
      },
      required: ['image_path']
    }
  },
  {
    name: 'create_step_guide',
    description: `Create a numbered step-by-step guide on a screenshot.

Automatically places numbered markers with labels and connecting arrows.
Perfect for tutorials and documentation.`,
    inputSchema: {
      type: 'object',
      properties: {
        input_path: {
          type: 'string',
          description: 'Path to input screenshot'
        },
        output_path: {
          type: 'string',
          description: 'Output path (optional)'
        },
        steps: {
          type: 'array',
          description: 'Array of steps',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'X coordinate for marker' },
              y: { type: 'number', description: 'Y coordinate for marker' },
              label: { type: 'string', description: 'Step description' },
              color: { type: 'string', description: 'Color (optional)' }
            },
            required: ['x', 'y', 'label']
          }
        },
        connect_steps: {
          type: 'boolean',
          description: 'Draw dashed lines connecting steps (default: true)'
        },
        theme: {
          type: 'string',
          enum: ['documentation', 'tutorial', 'bugReport', 'highlight']
        }
      },
      required: ['input_path', 'steps']
    }
  },
  {
    name: 'highlight_area',
    description: 'Quickly highlight a specific area with a shape and optional label.',
    inputSchema: {
      type: 'object',
      properties: {
        input_path: { type: 'string' },
        output_path: { type: 'string' },
        shape: {
          type: 'string',
          enum: ['circle', 'rect', 'highlight'],
          description: 'Shape type'
        },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number', description: 'Width (or diameter for circle)' },
        height: { type: 'number', description: 'Height (for rect only)' },
        color: { type: 'string', description: 'Color (default: red)' },
        label: { type: 'string', description: 'Optional label' },
        label_position: {
          type: 'string',
          enum: ['top', 'bottom', 'left', 'right'],
          description: 'Label position relative to shape'
        }
      },
      required: ['input_path', 'shape', 'x', 'y', 'width']
    }
  },
  {
    name: 'add_callout',
    description: 'Add a callout (speech bubble) pointing to a specific location.',
    inputSchema: {
      type: 'object',
      properties: {
        input_path: { type: 'string' },
        output_path: { type: 'string' },
        x: { type: 'number', description: 'X coordinate where pointer points' },
        y: { type: 'number', description: 'Y coordinate where pointer points' },
        text: { type: 'string', description: 'Callout text (supports \\n for newlines)' },
        pointer: {
          type: 'string',
          enum: ['top', 'bottom', 'left', 'right'],
          description: 'Direction the pointer comes from'
        },
        color: { type: 'string' },
        background: { type: 'string' }
      },
      required: ['input_path', 'x', 'y', 'text']
    }
  },
  {
    name: 'blur_area',
    description: 'Blur a rectangular area to hide sensitive information.',
    inputSchema: {
      type: 'object',
      properties: {
        input_path: { type: 'string' },
        output_path: { type: 'string' },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        intensity: { type: 'number', description: 'Blur intensity (default: 8)' }
      },
      required: ['input_path', 'x', 'y', 'width', 'height']
    }
  },
  {
    name: 'frame_screenshot',
    description: `Wrap a screenshot in a premium frame for docs: rounded corners, soft drop shadow,
padding on a matte background, and an optional browser title bar with traffic-light dots.
Use on a raw or already-annotated screenshot. Supports webp/jpeg output and downscale.`,
    inputSchema: {
      type: 'object',
      properties: {
        input_path: { type: 'string' },
        output_path: { type: 'string' },
        browser_bar: { type: 'boolean', description: 'Add a browser title bar with traffic-light dots' },
        padding: { type: 'number', description: 'Padding around the screenshot (default 64)' },
        background: { type: 'string', description: 'Matte color behind the frame (default #EEF1F5)' },
        radius: { type: 'number', description: 'Corner radius (default 14)' },
        shadow: { type: 'boolean', description: 'Drop shadow (default true)' },
        format: { type: 'string', enum: ['png', 'webp', 'jpeg', 'jpg'], description: 'Output format (default png)' },
        quality: { type: 'number', description: 'Quality 1-100 for webp/jpeg (default 90)' },
        downscale: { type: 'number', description: 'Resize factor, e.g. 0.6 (default 1)' }
      },
      required: ['input_path']
    }
  }
];

// Create server
const server = new Server(
  {
    name: 'image-annotator',
    version: '1.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

// Tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'annotate_screenshot':
        return await handleAnnotate(args);
      case 'get_image_dimensions':
        return await handleDimensions(args);
      case 'create_step_guide':
        return await handleStepGuide(args);
      case 'highlight_area':
        return await handleHighlight(args);
      case 'add_callout':
        return await handleCallout(args);
      case 'blur_area':
        return await handleBlur(args);
      case 'frame_screenshot':
        return await handleFrame(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Generate output path
function getOutputPath(inputPath, suffix = '-annotated') {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  return path.join(dir, `${base}${suffix}${ext}`);
}

// Handlers
async function handleAnnotate(args) {
  const { input_path, output_path, annotations, theme, scale, margin, matte, frame, format, quality, downscale } = args;

  if (!fs.existsSync(input_path)) {
    throw new Error(`File not found: ${input_path}`);
  }

  let finalPath = output_path || getOutputPath(input_path);
  // If a non-PNG format is requested but the output path doesn't match, fix the extension.
  if (format && !output_path) {
    finalPath = getOutputPath(input_path).replace(/\.[^.]+$/, `.${format === 'jpg' ? 'jpg' : format}`);
  }

  const result = await annotateImage(input_path, finalPath, annotations, {
    theme, scale, margin, matte, frame, format, quality, downscale
  });

  return {
    content: [{
      type: 'text',
      text: `✓ Annotated screenshot saved: ${result.outputPath}\n  Size: ${result.width}x${result.height}\n  Annotations: ${result.annotationCount}\n  Scale: ${result.scale}x${theme ? `\n  Theme: ${theme}` : ''}${frame ? '\n  Frame: on' : ''}`
    }]
  };
}

async function handleDimensions(args) {
  const { image_path } = args;

  if (!fs.existsSync(image_path)) {
    throw new Error(`File not found: ${image_path}`);
  }

  const dims = await getImageDimensions(image_path);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(dims, null, 2)
    }]
  };
}

async function handleStepGuide(args) {
  const { input_path, output_path, steps, connect_steps = true, theme } = args;

  if (!fs.existsSync(input_path)) {
    throw new Error(`File not found: ${input_path}`);
  }

  const colors = ['primary', 'green', 'orange', 'purple', 'cyan'];
  const annotations = [];

  // Add step markers and labels
  steps.forEach((step, i) => {
    const color = step.color || colors[i % colors.length];

    // Marker
    annotations.push({
      type: 'marker',
      x: step.x,
      y: step.y,
      number: i + 1,
      color,
      size: 24
    });

    // Label with arrow
    const labelX = step.x + 50;
    const labelY = step.y;

    annotations.push({
      type: 'arrow',
      from: [step.x + 28, step.y],
      to: [labelX - 5, labelY],
      color,
      strokeWidth: 2
    });

    annotations.push({
      type: 'label',
      x: labelX,
      y: labelY + 6,
      text: step.label,
      color: 'darkGray',
      fontSize: 16,
      background: 'white',
      shadow: true
    });

    // Connect to next step
    if (connect_steps && i < steps.length - 1) {
      const next = steps[i + 1];
      annotations.push({
        type: 'connector',
        from: [step.x, step.y + 30],
        to: [next.x, next.y - 30],
        color: 'gray'
      });
    }
  });

  const finalPath = output_path || getOutputPath(input_path, '-guide');
  const result = await annotateImage(input_path, finalPath, annotations, { theme });

  return {
    content: [{
      type: 'text',
      text: `✓ Step guide created: ${result.outputPath}\n  Steps: ${steps.length}`
    }]
  };
}

async function handleHighlight(args) {
  const { input_path, output_path, shape, x, y, width, height, color = 'red', label, label_position = 'right' } = args;

  if (!fs.existsSync(input_path)) {
    throw new Error(`File not found: ${input_path}`);
  }

  const annotations = [];

  if (shape === 'circle') {
    annotations.push({
      type: 'circle',
      x, y,
      radius: width / 2,
      color,
      strokeWidth: 3
    });
  } else if (shape === 'highlight') {
    annotations.push({
      type: 'highlight',
      x, y,
      width,
      height: height || width,
      color: 'yellow',
      opacity: 0.35
    });
  } else {
    annotations.push({
      type: 'rect',
      x, y,
      width,
      height: height || width,
      color,
      strokeWidth: 3
    });
  }

  if (label) {
    let labelX, labelY;
    const h = height || width;

    switch (label_position) {
      case 'top': labelX = x + width / 2; labelY = y - 10; break;
      case 'bottom': labelX = x + width / 2; labelY = y + h + 20; break;
      case 'left': labelX = x - 10; labelY = y + h / 2; break;
      default: labelX = x + width + 15; labelY = y + h / 2;
    }

    annotations.push({
      type: 'label',
      x: labelX,
      y: labelY,
      text: label,
      color,
      fontSize: 16,
      background: 'white',
      shadow: true
    });
  }

  const finalPath = output_path || getOutputPath(input_path, '-highlighted');
  await annotateImage(input_path, finalPath, annotations);

  return {
    content: [{
      type: 'text',
      text: `✓ Highlighted: ${finalPath}`
    }]
  };
}

async function handleCallout(args) {
  const { input_path, output_path, x, y, text, pointer = 'left', color = 'primary', background = 'white' } = args;

  if (!fs.existsSync(input_path)) {
    throw new Error(`File not found: ${input_path}`);
  }

  const annotations = [{
    type: 'callout',
    x, y,
    text,
    pointer,
    color,
    background,
    shadow: true
  }];

  const finalPath = output_path || getOutputPath(input_path, '-callout');
  await annotateImage(input_path, finalPath, annotations);

  return {
    content: [{
      type: 'text',
      text: `✓ Callout added: ${finalPath}`
    }]
  };
}

async function handleBlur(args) {
  const { input_path, output_path, x, y, width, height, intensity = 8 } = args;

  if (!fs.existsSync(input_path)) {
    throw new Error(`File not found: ${input_path}`);
  }

  const annotations = [{
    type: 'blur',
    x, y, width, height, intensity
  }];

  const finalPath = output_path || getOutputPath(input_path, '-blurred');
  await annotateImage(input_path, finalPath, annotations);

  return {
    content: [{
      type: 'text',
      text: `✓ Area blurred: ${finalPath}`
    }]
  };
}

async function handleFrame(args) {
  const {
    input_path, output_path, browser_bar = false, padding, background,
    radius, shadow, format, quality, downscale
  } = args;

  if (!fs.existsSync(input_path)) {
    throw new Error(`File not found: ${input_path}`);
  }

  const meta = await sharp(input_path).metadata();
  const scale = computeScale(meta.width);

  let buf = await frameImage(await sharp(input_path).png().toBuffer(), {
    scale, browserBar: browser_bar, padding, background, radius, shadow
  });

  if (downscale && downscale > 0 && downscale !== 1) {
    const m = await sharp(buf).metadata();
    buf = await sharp(buf).resize({ width: Math.round(m.width * downscale) }).png().toBuffer();
  }

  let finalPath = output_path || getOutputPath(input_path, '-framed');
  if (format && !output_path) {
    finalPath = getOutputPath(input_path, '-framed').replace(/\.[^.]+$/, `.${format === 'jpg' ? 'jpg' : format}`);
  }

  const fmt = (format || '').toLowerCase();
  let out = sharp(buf);
  if (fmt === 'webp') out = out.webp({ quality: quality || 90 });
  else if (fmt === 'jpeg' || fmt === 'jpg') out = out.flatten({ background: '#FFFFFF' }).jpeg({ quality: quality || 90 });
  else out = out.png();
  await out.toFile(finalPath);

  const fm = await sharp(buf).metadata();
  return {
    content: [{
      type: 'text',
      text: `✓ Framed screenshot saved: ${finalPath}\n  Size: ${fm.width}x${fm.height}${browser_bar ? '\n  Browser bar: on' : ''}`
    }]
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Image Annotator MCP Server v1.2.0 running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
