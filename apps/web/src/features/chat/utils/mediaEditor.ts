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
export async function applyAdjustmentsToImage(
  file: File,
  adj: Adjustments,
  quality: 'hd' | 'sd' = 'hd'
): Promise<File> {
  if (isDefaultAdjustments(adj)) {
    return file;
  }

  const jpegQuality = quality === 'sd' ? 0.75 : 0.92;
  const url = URL.createObjectURL(file);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const supportsFilter = ctxFilterSupported(ctx);

    if (supportsFilter) {
      const warmth = Math.max(0, (adj.warmth - 100) / 2);
      ctx.filter = `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%) sepia(${warmth}%)`;
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none';
    } else {
      ctx.drawImage(img, 0, 0);
      applyAdjustmentsPerPixel(ctx, canvas.width, canvas.height, adj);
    }

    // Determine output type — preserve original format, fall back to jpeg
    let outputType = file.type;
    if (!outputType || !outputType.startsWith('image/')) {
      outputType = 'image/jpeg';
    }
    // Some browsers don't support PNG/WebP encode via toBlob in all versions;
    // fall back to jpeg for exotic formats rather than failing.
    const supportedEncode = ['image/jpeg', 'image/png', 'image/webp'];
    if (!supportedEncode.includes(outputType)) {
      outputType = 'image/jpeg';
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        outputType,
        outputType === 'image/png' ? undefined : jpegQuality
      );
    });
    if (!blob) throw new Error('Canvas export returned null blob');

    // Preserve original filename, adjust extension if format changed
    let outName = file.name;
    if (outputType === 'image/jpeg' && !/\.(jpe?g)$/i.test(outName)) {
      outName = outName.replace(/\.[^.]+$/, '') + '.jpg';
    } else if (outputType === 'image/png' && !/\.png$/i.test(outName)) {
      outName = outName.replace(/\.[^.]+$/, '') + '.png';
    } else if (outputType === 'image/webp' && !/\.webp$/i.test(outName)) {
      outName = outName.replace(/\.[^.]+$/, '') + '.webp';
    }

    return new File([blob], outName, { type: outputType });
  } finally {
    URL.revokeObjectURL(url);
  }
}