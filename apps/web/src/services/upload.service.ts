/**
 * Upload Service
 * Handles file uploads through secure flow
 */

import { supabase } from '@/config/supabase.client';
import { UploadPurpose, getUploadConfig } from '@/config/storage.config';

interface UploadResponse {
  success: boolean;
  url?: string;
  filePath?: string;
  error?: string;
}

export type UploadQuality = 'hd' | 'sd';

let sdVideoWarned = false;

const SD_MAX_LONG_EDGE = 1280;
const SD_SKIP_IF_UNDER_BYTES = 500 * 1024;
const SD_JPEG_QUALITY = 0.75;

/**
 * Compress an image file for SD delivery.
 * Returns null if compression is skipped (already small enough).
 */
async function compressImageForSd(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = url;
    });
    const longEdge = Math.max(img.width, img.height);
    if (longEdge <= SD_MAX_LONG_EDGE && file.size <= SD_SKIP_IF_UNDER_BYTES) {
      return null;
    }
    const scale = Math.min(1, SD_MAX_LONG_EDGE / longEdge);
    const targetW = Math.round(img.width * scale);
    const targetH = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', SD_JPEG_QUALITY);
    });
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

class UploadService {
  async uploadFile(
    file: File,
    purpose: UploadPurpose,
    userId: string,
    quality: UploadQuality = 'hd'
  ): Promise<UploadResponse> {
    try {
      const config = getUploadConfig(purpose);

      // Validate file type
      if (!config.allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: `File type ${file.type} not allowed`,
        };
      }

      // Validate file size
      if (file.size > config.maxSizeBytes) {
        return {
          success: false,
          error: `File size exceeds ${config.maxSizeBytes / 1024 / 1024}MB`,
        };
      }

      // Generate unique file path
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      // SD compression: images only, skip GIFs and already-small files
      let fileExtension = file.name.split('.').pop() || 'jpg';
      let uploadBody: File | Blob = file;
      let uploadContentType: string | undefined = file.type || undefined;

      if (quality === 'sd' && file.type.startsWith('image/') && file.type !== 'image/gif') {
        const compressed = await compressImageForSd(file);
        if (compressed) {
          uploadBody = compressed;
          uploadContentType = 'image/jpeg';
          fileExtension = 'jpg';
        }
      } else if (quality === 'sd' && file.type.startsWith('video/')) {
        if (!sdVideoWarned) {
          console.warn('[upload] SD video compression is deferred to v2; uploading original');
          sdVideoWarned = true;
        }
      }

      const filePath = `${purpose}/${userId}/${timestamp}-${randomSuffix}.${fileExtension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, uploadBody, uploadContentType ? { contentType: uploadContentType } : undefined);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      return {
        success: true,
        url: publicUrl,
        filePath,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from('media').remove([filePath]);
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }
}

export const uploadService = new UploadService();
