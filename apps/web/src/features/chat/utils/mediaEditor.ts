/**
 * Media editor utilities — adjustments + canvas export.
 *
 * Responsibilities:
 *   - Represent the adjustment state (brightness/contrast/saturation/warmth).
 *   - Convert adjustments to a CSS filter string for live preview.
 *   - Export a File with adjustments baked into the pixels.
 *
 * Non-responsibilities:
 *   - SD downscale (1280px long edge) — that's upload.service.ts (commit 2A).
 *   - Markup / crop — commits 6 and 7.
 *
 * Export honors the caller's quality choice so a HD → export at 0.92,
 * SD → export at 0.75. Without this, adjusted photos would be double
 * compressed (once at export, once in upload.service.ts for SD).
 */

export type Adjustments = {
  brightness: number; // 0-200, 100 = neutral
  contrast: number;   // 0-200, 100 = neutral
  saturation: number; // 0-200, 100 = neutral
  warmth: number;     // 0-200, 100 = neutral (maps to sepia, no cool-shift)
};

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 100,
};

/**
 * True if all adjustment values are at their neutral defaults.
 * When true, applyAdjustmentsToImage short-circuits and returns the
 * original file untouched — no decode, no re-encode, no quality loss.
 */
export function isDefaultAdjustments(adj: Adjustments): boolean {
  return (
    adj.brightness === 100 &&
    adj.contrast === 100 &&
    adj.saturation === 100 &&
    adj.warmth === 100
  );
}

/**
 * CSS filter string for live preview on the <img> element.
 * Matches the math used by the canvas export path.
 */
export function cssFilterFromAdjustments(adj: Adjustments): string {
  const b = adj.brightness;
  const c = adj.contrast;
  const s = adj.saturation;
  const w = Math.max(0, (adj.warmth - 100) / 2); // 100→0, 200→50
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${w}%)`;
}

/** Module-level flag so the Firefox warmth warning logs once per session. */
let firefoxWarmthWarned = false;

/**
 * Detect whether canvas 2d context supports the `filter` property.
 * Chrome/Safari/Edge: yes. Firefox: no (as of 2024/2025).
 */
function ctxFilterSupported(ctx: CanvasRenderingContext2D): boolean {
  try {
    ctx.filter = 'blur(1px)';
    const supported = ctx.filter === 'blur(1px)';
    ctx.filter = 'none';
    return supported;
  } catch {
    return false;
  }
}

/**
 * Per-pixel fallback for browsers without ctx.filter (Firefox).
 * Applies brightness, contrast, saturation. Warmth is skipped — a
 * per-pixel sepia blend is not worth 20 lines of colorspace math for
 * a 5% browser edge case. Logs once per session if warmth is non-default.
 */
function applyAdjustmentsPerPixel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adj: Adjustments
): void {
  if (adj.warmth !== 100 && !firefoxWarmthWarned) {
    console.warn(
      '[mediaEditor] warmth not supported on this browser; skipping. ' +
        'Use Chrome/Safari/Edge for full adjustments.'
    );
    firefoxWarmthWarned = true;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const b = adj.brightness / 100;
  const c = adj.contrast / 100;
  const s = adj.saturation / 100;
  // Contrast pivots around 128. Pre-compute for speed.
  const contrastOffset = 128 * (1 - c);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let bl = data[i + 2];

    // Brightness
    r *= b;
    g *= b;
    bl *= b;

    // Contrast
    r = r * c + contrastOffset;
    g = g * c + contrastOffset;
    bl = bl * c + contrastOffset;

    // Saturation (using luminance approx)
    const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
    r = lum + (r - lum) * s;
    g = lum + (g - lum) * s;
    bl = lum + (bl - lum) * s;

    // Clamp
    data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    data[i + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
  }

  ctx.putImageData(imageData, 0, 0);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Bake adjustments into a new File.
 *
 * - If adjustments are default, returns the original File untouched.
 * - Export preserves natural dimensions (SD downscale is 2A's job).
 * - Export preserves the input format (PNG→PNG, WebP→WebP, JPEG→JPEG).
 *   Falls back to image/jpeg if file.type is empty (drag-drop edge case).
 * - Quality maps: 'hd' → 0.92, 'sd' → 0.75. Matches upload.service.ts.
 *   Without this, SD users who adjust photos get double-compressed.
 */
// ============================================================================
// Crop types + geometry (commit 6A)
// ============================================================================

/**
 * Crop rectangle in NATURAL image pixels (not rendered/screen pixels).
 * `x` and `y` are the top-left corner. All four values are non-negative.
 */
export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AspectPreset = '1:1' | '4:5' | '16:9' | 'original' | 'free';

/**
 * Compute the initial centered crop rect for a given aspect preset.
 *
 * - 'original' and 'free' return the full image.
 * - Named ratios return the largest centered rect with that ratio that fits
 *   inside the image (no overflow, no letterbox).
 *
 * Single-algorithm implementation: the `ratio > imageRatio` branch handles
 * every aspect-locked case. Adding new presets is one string in the
 * AspectPreset union — no new branch here.
 */
export function computeCropRect(
  imageW: number,
  imageH: number,
  preset: AspectPreset
): CropRect {
  if (preset === 'original' || preset === 'free') {
    return { x: 0, y: 0, width: imageW, height: imageH };
  }

  const [rw, rh] = preset.split(':').map(Number);
  const ratio = rw / rh;
  const imageRatio = imageW / imageH;

  let width: number;
  let height: number;
  if (ratio > imageRatio) {
    width = imageW;
    height = imageW / ratio;
  } else {
    height = imageH;
    width = imageH * ratio;
  }

  const x = (imageW - width) / 2;
  const y = (imageH - height) / 2;
  return { x, y, width, height };
}

/**
 * Scale crop rect from natural image pixels to rendered screen pixels.
 *
 * IMPORTANT: `renderedW` and `renderedH` must be the dimensions of the
 * RENDERED IMAGE CONTENT (not the container, which may include letterboxing).
 * The caller (CropOverlay in 6B) is responsible for providing these
 * correctly. When the container is exactly sized to the image content,
 * renderedW === containerW and this is straightforward.
 */
export function scaleCropToScreen(
  crop: CropRect,
  renderedW: number,
  renderedH: number,
  naturalW: number,
  naturalH: number
): CropRect {
  const scaleX = renderedW / naturalW;
  const scaleY = renderedH / naturalH;
  return {
    x: crop.x * scaleX,
    y: crop.y * scaleY,
    width: crop.width * scaleX,
    height: crop.height * scaleY,
  };
}

/**
 * Inverse of scaleCropToScreen — pointer events happen in rendered pixels;
 * the crop state is stored in natural pixels.
 *
 * Same IMPORTANT note as scaleCropToScreen: renderedW/H are the CONTENT
 * dimensions, not the container.
 */
export function scaleCropToNatural(
  rendered: CropRect,
  renderedW: number,
  renderedH: number,
  naturalW: number,
  naturalH: number
): CropRect {
  const scaleX = renderedW / naturalW;
  const scaleY = renderedH / naturalH;
  return {
    x: rendered.x / scaleX,
    y: rendered.y / scaleY,
    width: rendered.width / scaleX,
    height: rendered.height / scaleY,
  };
}

// ============================================================================
// Combined export — crop + adjustments in a single pass (commit 6A)
// ============================================================================

/**
 * Bake crop + adjustments into a new File in one decode/encode pass.
 *
 * No `quality` parameter. This function ALWAYS outputs at maximum useful
 * quality (0.92 JPEG, or format-preserved with the same quality). The
 * upload layer (upload.service.ts) is the ONLY place SD compression happens.
 * Passing quality here would double-compress on SD — that was the bug fixed
 * in commit 5C.
 */
export async function exportImage(
  file: File,
  opts: {
    crop: CropRect | null;
    rotation?: number;
    adjustments: Adjustments;
    markup: Stroke[] | null;
  }
): Promise<File> {
  const { crop, rotation = 0, adjustments, markup } = opts;
  const markupApplied = markup !== null && markup.length > 0;
  const cropApplied = crop !== null;
  const adjustApplied = !isDefaultAdjustments(adjustments);

  if (!cropApplied && !adjustApplied && !markupApplied && rotation === 0) {
    return file;
  }

  const url = URL.createObjectURL(file);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // 1. Rotate the image on a temp canvas
    const rad = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const boundsW = img.naturalWidth * cos + img.naturalHeight * sin;
    const boundsH = img.naturalWidth * sin + img.naturalHeight * cos;

    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = boundsW;
    rotCanvas.height = boundsH;
    const rotCtx = rotCanvas.getContext('2d');
    if (!rotCtx) throw new Error('Failed to get rotation context');

    rotCtx.translate(boundsW / 2, boundsH / 2);
    rotCtx.rotate(rad);
    rotCtx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2);
    rotCtx.drawImage(img, 0, 0);

    // 2. Crop the rotated image
    let finalCanvas = rotCanvas;
    if (crop) {
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = crop.width;
      cropCanvas.height = crop.height;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) throw new Error('Failed to get crop context');

      cropCtx.drawImage(
        rotCanvas,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, crop.width, crop.height
      );
      finalCanvas = cropCanvas;
    }

    // 3. Apply adjustments and markup
    canvas.width = finalCanvas.width;
    canvas.height = finalCanvas.height;
    const finalCtx = canvas.getContext('2d');
    if (!finalCtx) throw new Error('Failed to get final context');

    const supportsFilter = ctxFilterSupported(finalCtx);
    if (adjustApplied && supportsFilter) {
      const warmth = Math.max(0, (adjustments.warmth - 100) / 2);
      finalCtx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) sepia(${warmth}%)`;
    }

    finalCtx.drawImage(finalCanvas, 0, 0);

    if (adjustApplied && supportsFilter) {
      finalCtx.filter = 'none';
    }

    if (adjustApplied && !supportsFilter) {
      applyAdjustmentsPerPixel(finalCtx, finalCanvas.width, finalCanvas.height, adjustments);
    }

    if (markupApplied && markup) {
      renderMarkupToCanvas(finalCtx, markup, finalCanvas.width, finalCanvas.height, finalCanvas.width, finalCanvas.height);
    }

    let outputType = file.type;
    if (!outputType || !outputType.startsWith('image/')) outputType = 'image/jpeg';
    const supportedEncode = ['image/jpeg', 'image/png', 'image/webp'];
    if (!supportedEncode.includes(outputType)) outputType = 'image/jpeg';

    const blob = await new Promise<Blob | null>((resolve) => {
      finalCanvas.toBlob((b) => resolve(b), outputType, outputType === 'image/png' ? undefined : 0.92);
    });
    if (!blob) throw new Error('Canvas export returned null blob');

    let outName = file.name;
    if (outputType === 'image/jpeg' && !/\\.(jpe?g)$/i.test(outName)) outName = outName.replace(/\\.[^.]+$/, '') + '.jpg';
    else if (outputType === 'image/png' && !/\\.png$/i.test(outName)) outName = outName.replace(/\\.[^.]+$/, '') + '.png';
    else if (outputType === 'image/webp' && !/\\.webp$/i.test(outName)) outName = outName.replace(/\\.[^.]+$/, '') + '.webp';

    return new File([blob], outName, { type: outputType });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// Backward-compat wrapper (deprecated)
// ============================================================================

/**
 * @deprecated Use exportImage(file, { crop: null, adjustments }) instead.
 * Kept for compatibility. The `quality` parameter is IGNORED — export always
 * produces max quality (0.92); the upload layer owns SD compression.
 */
export async function applyAdjustmentsToImage(
  file: File,
  adj: Adjustments,
  _quality?: 'hd' | 'sd'
): Promise<File> {
  return exportImage(file, { crop: null, adjustments: adj, markup: null });
}
// ============================================================================
// Markup (freehand drawing) — commit 7A
// ============================================================================

export type StrokePoint = { x: number; y: number };

export type BrushType = 'pen' | 'highlighter' | 'marker';

export type Stroke = {
  points: StrokePoint[];
  color: string;
  width: number; // in natural image pixels
  brushType: BrushType;
};

/**
 * Draw strokes onto a 2D context at target dimensions.
 *
 * Stroke points are in NATURAL image pixels (source coordinate space).
 * The caller's canvas is typically the target (crop-resized) canvas —
 * we scale points from natural to target space so a stroke drawn on a
 * 4000×3000 image shows up correctly on a 1200×900 crop.
 *
 * Line width also scales proportionally so visual thickness is preserved.
 */
export function renderMarkupToCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  naturalW: number,
  naturalH: number,
  targetW: number = ctx.canvas.width,
  targetH: number = ctx.canvas.height
): void {
  if (strokes.length === 0) return;

  const scaleX = targetW / naturalW;
  const scaleY = targetH / naturalH;
  const avgScale = (scaleX + scaleY) / 2;

  ctx.save();

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;

    // Apply brush type properties
    let widthMultiplier = 1;
    if (stroke.brushType === 'highlighter') {
      widthMultiplier = 3.5;
      ctx.globalAlpha = 0.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (stroke.brushType === 'marker') {
      widthMultiplier = 2.0;
      ctx.globalAlpha = 0.9;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
    } else {
      widthMultiplier = 1.0;
      ctx.globalAlpha = 1.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = Math.max(1, stroke.width * avgScale * widthMultiplier);

    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x * scaleX, p.y * scaleY, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    const first = stroke.points[0];
    ctx.moveTo(first.x * scaleX, first.y * scaleY);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      ctx.lineTo(p.x * scaleX, p.y * scaleY);
    }
    ctx.stroke();
  }

  ctx.restore();
}
