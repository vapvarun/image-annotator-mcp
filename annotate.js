/**
 * Image Annotator - Professional screenshot annotation tool
 *
 * Add markers, arrows, callouts, highlights, and more to screenshots
 * for creating documentation, tutorials, and bug reports.
 *
 * @author Varun Developers
 * @license MIT
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Professional color palette
const COLORS = {
  // Primary colors
  red: '#E53935',
  orange: '#FB8C00',
  yellow: '#FDD835',
  green: '#43A047',
  blue: '#1E88E5',
  purple: '#8E24AA',
  pink: '#D81B60',
  cyan: '#00ACC1',
  teal: '#00897B',

  // Neutrals
  white: '#FFFFFF',
  black: '#212121',
  gray: '#757575',
  lightGray: '#E0E0E0',
  darkGray: '#424242',

  // Semantic colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Documentation colors
  primary: '#1976D2',
  secondary: '#7B1FA2',
  accent: '#FF4081'
};

// Preset themes for different use cases
const THEMES = {
  documentation: {
    marker: { color: 'primary', size: 28 },
    arrow: { color: 'primary', strokeWidth: 3 },
    label: { color: 'primary', fontSize: 18, background: 'white' },
    callout: { color: 'primary', background: 'white' }
  },
  tutorial: {
    marker: { color: 'green', size: 32 },
    arrow: { color: 'green', strokeWidth: 4 },
    label: { color: 'darkGray', fontSize: 20, background: 'lightGray' },
    callout: { color: 'green', background: 'white' }
  },
  bugReport: {
    marker: { color: 'error', size: 28 },
    arrow: { color: 'error', strokeWidth: 3 },
    label: { color: 'error', fontSize: 18, background: 'white' },
    callout: { color: 'error', background: 'white' }
  },
  highlight: {
    marker: { color: 'warning', size: 28 },
    arrow: { color: 'warning', strokeWidth: 3 },
    label: { color: 'darkGray', fontSize: 18, background: 'yellow' },
    callout: { color: 'warning', background: 'yellow' }
  }
};

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  if (typeof text !== 'string') return String(text);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get color value from name or hex
 */
function getColor(color) {
  return COLORS[color] || color || COLORS.red;
}

/**
 * Generate unique ID for SVG elements
 */
let idCounter = 0;
function generateId(prefix = 'ann') {
  return `${prefix}-${++idCounter}`;
}

/**
 * Create drop shadow filter definition
 */
function createDropShadow(id, blur = 4, opacity = 0.3) {
  return `
    <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="${blur}" flood-opacity="${opacity}"/>
    </filter>
  `;
}

/**
 * Create professional numbered marker with shadow and gradient
 */
function createMarker({ x, y, number, color = 'red', size = 28, shadow = true, style = 'filled' }) {
  const c = getColor(color);
  const id = generateId('marker');
  const defs = [];
  const elements = [];

  // Add drop shadow
  if (shadow) {
    const shadowId = `${id}-shadow`;
    defs.push(createDropShadow(shadowId));
  }

  // Create gradient for 3D effect
  const gradientId = `${id}-gradient`;
  defs.push(`
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${c};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${adjustColor(c, -30)};stop-opacity:1" />
    </linearGradient>
  `);

  const filterAttr = shadow ? `filter="url(#${id}-shadow)"` : '';

  if (style === 'filled') {
    // Filled circle with number
    elements.push(`
      <circle cx="${x}" cy="${y}" r="${size}" fill="url(#${gradientId})" ${filterAttr}/>
      <circle cx="${x}" cy="${y}" r="${size - 2}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <text x="${x}" y="${y + size * 0.35}" text-anchor="middle" fill="white"
            font-size="${size * 0.9}" font-weight="bold" font-family="Arial, Helvetica, sans-serif">${number}</text>
    `);
  } else if (style === 'outline') {
    // Outlined circle with number
    elements.push(`
      <circle cx="${x}" cy="${y}" r="${size}" fill="white" stroke="${c}" stroke-width="3" ${filterAttr}/>
      <text x="${x}" y="${y + size * 0.35}" text-anchor="middle" fill="${c}"
            font-size="${size * 0.9}" font-weight="bold" font-family="Arial, Helvetica, sans-serif">${number}</text>
    `);
  } else if (style === 'badge') {
    // Badge style (pill shape for multi-digit)
    const isMultiDigit = number > 9;
    const width = isMultiDigit ? size * 1.6 : size * 2;
    const height = size * 2;
    elements.push(`
      <rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}"
            rx="${height / 2}" fill="url(#${gradientId})" ${filterAttr}/>
      <text x="${x}" y="${y + size * 0.35}" text-anchor="middle" fill="white"
            font-size="${size * 0.9}" font-weight="bold" font-family="Arial, Helvetica, sans-serif">${number}</text>
    `);
  }

  return { defs: defs.join('\n'), element: elements.join('\n') };
}

/**
 * Create professional arrow with arrowhead
 */
function createArrow({ from, to, color = 'red', strokeWidth = 3, style = 'solid', headStyle = 'filled', shadow = true }) {
  const c = getColor(color);
  const [x1, y1] = from;
  const [x2, y2] = to;
  const id = generateId('arrow');
  const defs = [];

  // Add drop shadow
  if (shadow) {
    defs.push(createDropShadow(`${id}-shadow`, 2, 0.2));
  }

  // Arrow head marker
  const headSize = Math.max(10, strokeWidth * 3);
  if (headStyle === 'filled') {
    defs.push(`
      <marker id="${id}-head" markerWidth="${headSize}" markerHeight="${headSize * 0.7}"
              refX="${headSize - 1}" refY="${headSize * 0.35}" orient="auto" markerUnits="userSpaceOnUse">
        <polygon points="0 0, ${headSize} ${headSize * 0.35}, 0 ${headSize * 0.7}" fill="${c}"/>
      </marker>
    `);
  } else if (headStyle === 'open') {
    defs.push(`
      <marker id="${id}-head" markerWidth="${headSize}" markerHeight="${headSize * 0.7}"
              refX="${headSize - 1}" refY="${headSize * 0.35}" orient="auto" markerUnits="userSpaceOnUse">
        <polyline points="0 0, ${headSize} ${headSize * 0.35}, 0 ${headSize * 0.7}"
                  fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
      </marker>
    `);
  }

  const dashArray = style === 'dashed' ? 'stroke-dasharray="10,5"' : '';
  const filterAttr = shadow ? `filter="url(#${id}-shadow)"` : '';

  const element = `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
          stroke="${c}" stroke-width="${strokeWidth}" stroke-linecap="round"
          marker-end="url(#${id}-head)" ${dashArray} ${filterAttr}/>
  `;

  return { defs: defs.join('\n'), element };
}

/**
 * Create curved arrow with smooth bezier curve
 */
function createCurvedArrow({ from, to, curve = 50, color = 'red', strokeWidth = 3, headStyle = 'filled', shadow = true }) {
  const c = getColor(color);
  const [x1, y1] = from;
  const [x2, y2] = to;
  const id = generateId('curved-arrow');
  const defs = [];

  // Calculate control point
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = midX + nx * curve;
  const cy = midY + ny * curve;

  // Add drop shadow
  if (shadow) {
    defs.push(createDropShadow(`${id}-shadow`, 2, 0.2));
  }

  // Arrow head
  const headSize = Math.max(10, strokeWidth * 3);
  defs.push(`
    <marker id="${id}-head" markerWidth="${headSize}" markerHeight="${headSize * 0.7}"
            refX="${headSize - 1}" refY="${headSize * 0.35}" orient="auto" markerUnits="userSpaceOnUse">
      <polygon points="0 0, ${headSize} ${headSize * 0.35}, 0 ${headSize * 0.7}" fill="${c}"/>
    </marker>
  `);

  const filterAttr = shadow ? `filter="url(#${id}-shadow)"` : '';

  const element = `
    <path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}"
          fill="none" stroke="${c}" stroke-width="${strokeWidth}" stroke-linecap="round"
          marker-end="url(#${id}-head)" ${filterAttr}/>
  `;

  return { defs: defs.join('\n'), element };
}

/**
 * Create professional callout box with pointer
 */
function createCallout({ x, y, text, color = 'primary', background = 'white', width = null, pointer = 'bottom', fontSize = 16, shadow = true }) {
  const borderColor = getColor(color);
  const bgColor = getColor(background);
  const id = generateId('callout');
  const defs = [];

  // Calculate dimensions
  const padding = 12;
  const lineHeight = fontSize * 1.4;
  const lines = text.split('\n');
  const textWidth = width || Math.max(...lines.map(l => l.length * fontSize * 0.6)) + padding * 2;
  const textHeight = lines.length * lineHeight + padding * 2;

  // Add drop shadow
  if (shadow) {
    defs.push(createDropShadow(`${id}-shadow`, 4, 0.15));
  }

  const filterAttr = shadow ? `filter="url(#${id}-shadow)"` : '';

  // Calculate box position based on pointer
  let boxX, boxY, pointerPath;
  const pointerSize = 12;

  switch (pointer) {
    case 'top':
      boxX = x - textWidth / 2;
      boxY = y + pointerSize;
      pointerPath = `M${x - pointerSize},${y + pointerSize} L${x},${y} L${x + pointerSize},${y + pointerSize}`;
      break;
    case 'bottom':
      boxX = x - textWidth / 2;
      boxY = y - textHeight - pointerSize;
      pointerPath = `M${x - pointerSize},${y - pointerSize} L${x},${y} L${x + pointerSize},${y - pointerSize}`;
      break;
    case 'left':
      boxX = x + pointerSize;
      boxY = y - textHeight / 2;
      pointerPath = `M${x + pointerSize},${y - pointerSize} L${x},${y} L${x + pointerSize},${y + pointerSize}`;
      break;
    case 'right':
      boxX = x - textWidth - pointerSize;
      boxY = y - textHeight / 2;
      pointerPath = `M${x - pointerSize},${y - pointerSize} L${x},${y} L${x - pointerSize},${y + pointerSize}`;
      break;
    default:
      boxX = x;
      boxY = y;
      pointerPath = '';
  }

  // Build text elements
  const textElements = lines.map((line, i) =>
    `<tspan x="${boxX + padding}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const element = `
    <g ${filterAttr}>
      <rect x="${boxX}" y="${boxY}" width="${textWidth}" height="${textHeight}"
            rx="6" fill="${bgColor}" stroke="${borderColor}" stroke-width="2"/>
      ${pointerPath ? `<path d="${pointerPath}" fill="${bgColor}" stroke="${borderColor}" stroke-width="2"/>` : ''}
      <text x="${boxX + padding}" y="${boxY + padding + fontSize}"
            fill="${getColor('darkGray')}" font-size="${fontSize}" font-family="Arial, Helvetica, sans-serif">
        ${textElements}
      </text>
    </g>
  `;

  return { defs: defs.join('\n'), element };
}

/**
 * Create rectangle/box highlight
 */
function createRect({ x, y, width, height, color = 'red', strokeWidth = 3, fill = 'none', cornerRadius = 8, style = 'solid', shadow = false }) {
  const c = getColor(color);
  const fillColor = fill === 'none' ? 'none' : getColor(fill);
  const id = generateId('rect');
  const defs = [];

  if (shadow) {
    defs.push(createDropShadow(`${id}-shadow`));
  }

  const dashArray = style === 'dashed' ? 'stroke-dasharray="10,5"' : '';
  const filterAttr = shadow ? `filter="url(#${id}-shadow)"` : '';

  const element = `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${cornerRadius}"
          fill="${fillColor}" stroke="${c}" stroke-width="${strokeWidth}" ${dashArray} ${filterAttr}/>
  `;

  return { defs: defs.join('\n'), element };
}

/**
 * Create circle highlight
 */
function createCircle({ x, y, radius = 30, color = 'red', strokeWidth = 3, fill = 'none', style = 'solid', shadow = false }) {
  const c = getColor(color);
  const fillColor = fill === 'none' ? 'none' : getColor(fill);
  const id = generateId('circle');
  const defs = [];

  if (shadow) {
    defs.push(createDropShadow(`${id}-shadow`));
  }

  const dashArray = style === 'dashed' ? 'stroke-dasharray="8,4"' : '';
  const filterAttr = shadow ? `filter="url(#${id}-shadow)"` : '';

  const element = `
    <circle cx="${x}" cy="${y}" r="${radius}"
            fill="${fillColor}" stroke="${c}" stroke-width="${strokeWidth}" ${dashArray} ${filterAttr}/>
  `;

  return { defs: defs.join('\n'), element };
}

/**
 * Create text label with optional background
 */
function createLabel({ x, y, text, color = 'darkGray', fontSize = 16, fontWeight = 'bold', background = null, padding = 8, cornerRadius = 4, shadow = false }) {
  const textColor = getColor(color);
  const id = generateId('label');
  const defs = [];
  const elements = [];

  // Calculate text dimensions
  const textWidth = text.length * fontSize * 0.6;
  const textHeight = fontSize * 1.2;

  if (shadow && background) {
    defs.push(createDropShadow(`${id}-shadow`, 3, 0.15));
  }

  const filterAttr = (shadow && background) ? `filter="url(#${id}-shadow)"` : '';

  if (background) {
    const bgColor = getColor(background);
    elements.push(`
      <rect x="${x - padding}" y="${y - textHeight - padding + 4}"
            width="${textWidth + padding * 2}" height="${textHeight + padding * 2}"
            rx="${cornerRadius}" fill="${bgColor}" ${filterAttr}/>
    `);
  }

  elements.push(`
    <text x="${x}" y="${y}" fill="${textColor}" font-size="${fontSize}"
          font-weight="${fontWeight}" font-family="Arial, Helvetica, sans-serif">${escapeXml(text)}</text>
  `);

  return { defs: defs.join('\n'), element: elements.join('\n') };
}

/**
 * Create highlight overlay
 */
function createHighlight({ x, y, width, height, color = 'yellow', opacity = 0.35, cornerRadius = 0 }) {
  const c = getColor(color);
  return {
    defs: '',
    element: `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${cornerRadius}" fill="${c}" opacity="${opacity}"/>`
  };
}

/**
 * Create blur mask for sensitive content
 */
function createBlur({ x, y, width, height, intensity = 8 }) {
  const id = generateId('blur');
  return {
    defs: `
      <filter id="${id}">
        <feGaussianBlur stdDeviation="${intensity}"/>
      </filter>
    `,
    element: `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#808080" filter="url(#${id})"/>`
  };
}

/**
 * Create step connector line between two points
 */
function createConnector({ from, to, color = 'gray', strokeWidth = 2, style = 'dashed' }) {
  const c = getColor(color);
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dashArray = style === 'dashed' ? 'stroke-dasharray="6,4"' : '';

  return {
    defs: '',
    element: `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${strokeWidth}" ${dashArray}/>`
  };
}

/**
 * Create icon badge (checkmark, x, warning, info)
 */
function createIcon({ x, y, icon, color = 'green', size = 24, shadow = true }) {
  const c = getColor(color);
  const id = generateId('icon');
  const defs = [];

  if (shadow) {
    defs.push(createDropShadow(`${id}-shadow`));
  }

  const filterAttr = shadow ? `filter="url(#${id}-shadow)"` : '';
  let iconPath;

  switch (icon) {
    case 'check':
    case 'checkmark':
      iconPath = `<path d="M${x - size * 0.3},${y} L${x - size * 0.1},${y + size * 0.25} L${x + size * 0.35},${y - size * 0.25}"
                       fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case 'x':
    case 'cross':
      iconPath = `
        <line x1="${x - size * 0.2}" y1="${y - size * 0.2}" x2="${x + size * 0.2}" y2="${y + size * 0.2}" stroke="white" stroke-width="3" stroke-linecap="round"/>
        <line x1="${x + size * 0.2}" y1="${y - size * 0.2}" x2="${x - size * 0.2}" y2="${y + size * 0.2}" stroke="white" stroke-width="3" stroke-linecap="round"/>
      `;
      break;
    case 'warning':
    case '!':
      iconPath = `
        <line x1="${x}" y1="${y - size * 0.15}" x2="${x}" y2="${y + size * 0.05}" stroke="white" stroke-width="3" stroke-linecap="round"/>
        <circle cx="${x}" cy="${y + size * 0.25}" r="2" fill="white"/>
      `;
      break;
    case 'info':
    case 'i':
      iconPath = `
        <circle cx="${x}" cy="${y - size * 0.2}" r="2" fill="white"/>
        <line x1="${x}" y1="${y - size * 0.05}" x2="${x}" y2="${y + size * 0.25}" stroke="white" stroke-width="3" stroke-linecap="round"/>
      `;
      break;
    case 'question':
    case '?':
      iconPath = `
        <path d="M${x - size * 0.15},${y - size * 0.25} Q${x - size * 0.15},${y - size * 0.4} ${x},${y - size * 0.4}
                Q${x + size * 0.2},${y - size * 0.4} ${x + size * 0.2},${y - size * 0.2}
                Q${x + size * 0.2},${y - size * 0.05} ${x},${y}"
              fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="${x}" cy="${y + size * 0.2}" r="2" fill="white"/>
      `;
      break;
    default:
      iconPath = '';
  }

  return {
    defs: defs.join('\n'),
    element: `
      <g ${filterAttr}>
        <circle cx="${x}" cy="${y}" r="${size}" fill="${c}"/>
        ${iconPath}
      </g>
    `
  };
}

/**
 * Adjust color brightness
 */
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Build complete SVG from annotations
 */
function buildSvg(width, height, annotations, theme = null) {
  // Reset ID counter for each build
  idCounter = 0;

  const defs = [];
  const elements = [];

  // Apply theme defaults if specified
  const themeDefaults = theme ? THEMES[theme] : null;

  for (const ann of annotations) {
    // Merge with theme defaults
    const mergedAnn = themeDefaults && themeDefaults[ann.type]
      ? { ...themeDefaults[ann.type], ...ann }
      : ann;

    let result;

    switch (ann.type) {
      case 'marker':
      case 'number':
        result = createMarker(mergedAnn);
        break;
      case 'arrow':
        result = createArrow(mergedAnn);
        break;
      case 'curved-arrow':
      case 'curvedArrow':
        result = createCurvedArrow(mergedAnn);
        break;
      case 'callout':
        result = createCallout(mergedAnn);
        break;
      case 'rect':
      case 'rectangle':
      case 'box':
        result = createRect(mergedAnn);
        break;
      case 'circle':
        result = createCircle(mergedAnn);
        break;
      case 'label':
      case 'text':
        result = createLabel(mergedAnn);
        break;
      case 'highlight':
        result = createHighlight(mergedAnn);
        break;
      case 'blur':
        result = createBlur(mergedAnn);
        break;
      case 'connector':
      case 'line':
        result = createConnector(mergedAnn);
        break;
      case 'icon':
        result = createIcon(mergedAnn);
        break;
      default:
        console.warn(`Unknown annotation type: ${ann.type}`);
        continue;
    }

    if (result) {
      if (result.defs) defs.push(result.defs);
      if (result.element) elements.push(result.element);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${defs.join('\n')}
  </defs>
  ${elements.join('\n')}
</svg>`;
}

/**
 * Main annotation function
 */
async function annotateImage(inputPath, outputPath, annotations, options = {}) {
  // Validate input
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  // Get image metadata
  const metadata = await sharp(inputPath).metadata();
  const { width, height } = metadata;

  // Build SVG overlay
  const svg = buildSvg(width, height, annotations, options.theme);

  // Composite SVG onto image
  await sharp(inputPath)
    .composite([{
      input: Buffer.from(svg),
      top: 0,
      left: 0
    }])
    .toFile(outputPath);

  return {
    outputPath,
    width,
    height,
    annotationCount: annotations.length
  };
}

/**
 * Get image dimensions
 */
async function getImageDimensions(imagePath) {
  const metadata = await sharp(imagePath).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format
  };
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Image Annotator - Professional screenshot annotation tool

Usage:
  node annotate.js <input> <output> --annotations '<json>' [--theme <name>]

Annotation Types:
  marker      Numbered circle (1, 2, 3...) with shadow
              { type: "marker", x, y, number, color?, size?, style?: "filled"|"outline"|"badge" }

  arrow       Straight arrow with arrowhead
              { type: "arrow", from: [x,y], to: [x,y], color?, strokeWidth?, style?: "solid"|"dashed" }

  curved-arrow  Curved bezier arrow
              { type: "curved-arrow", from: [x,y], to: [x,y], curve?, color? }

  callout     Text box with pointer
              { type: "callout", x, y, text, pointer?: "top"|"bottom"|"left"|"right", color?, background? }

  rect        Rectangle highlight
              { type: "rect", x, y, width, height, color?, cornerRadius?, style?: "solid"|"dashed" }

  circle      Circle highlight
              { type: "circle", x, y, radius, color?, style?: "solid"|"dashed" }

  label       Text label with optional background
              { type: "label", x, y, text, color?, fontSize?, background? }

  highlight   Semi-transparent overlay
              { type: "highlight", x, y, width, height, color?, opacity? }

  blur        Blur sensitive content
              { type: "blur", x, y, width, height, intensity? }

  connector   Dashed line between points
              { type: "connector", from: [x,y], to: [x,y], color? }

  icon        Icon badge (check, x, warning, info, question)
              { type: "icon", x, y, icon, color?, size? }

Themes: documentation, tutorial, bugReport, highlight

Colors: red, orange, yellow, green, blue, purple, pink, cyan, teal,
        white, black, gray, lightGray, darkGray,
        success, warning, error, info, primary, secondary, accent

Example:
  node annotate.js screenshot.png annotated.png --theme documentation --annotations '[
    {"type": "marker", "x": 200, "y": 100, "number": 1},
    {"type": "arrow", "from": [230, 100], "to": [350, 150]},
    {"type": "callout", "x": 400, "y": 180, "text": "Click here to continue", "pointer": "left"}
  ]'
    `);
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }

  const inputPath = args[0];
  const outputPath = args[1];

  // Parse options
  const annotationsIndex = args.indexOf('--annotations');
  const themeIndex = args.indexOf('--theme');

  if (annotationsIndex === -1 || !args[annotationsIndex + 1]) {
    console.error('Error: --annotations required');
    process.exit(1);
  }

  let annotations;
  try {
    annotations = JSON.parse(args[annotationsIndex + 1]);
  } catch (e) {
    console.error('Error parsing annotations JSON:', e.message);
    process.exit(1);
  }

  const theme = themeIndex !== -1 ? args[themeIndex + 1] : null;

  try {
    const result = await annotateImage(inputPath, outputPath, annotations, { theme });
    console.log(`✓ Annotated image saved: ${result.outputPath}`);
    console.log(`  Dimensions: ${result.width}x${result.height}`);
    console.log(`  Annotations: ${result.annotationCount}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = {
  annotateImage,
  buildSvg,
  getImageDimensions,
  COLORS,
  THEMES
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}
