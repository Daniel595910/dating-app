import { supabase } from '@/config/supabase.client';
import { PostMedia } from '../types/community.types';

interface UploadResult {
  success: boolean;
  media?: PostMedia;
  error?: string;
}

class MediaService {
  async uploadImage(
    file: File,
    userId: string,
    purpose: 'post_image' | 'avatar' | 'cover_photo'
  ): Promise<UploadResult> {
    try {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return { success: false, error: `File type ${file.type} not allowed` };
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return { success: false, error: 'File size exceeds 10MB limit' };
      }

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filePath = `${purpose}/${userId}/${timestamp}-${randomSuffix}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        return { success: false, error: 'Failed to upload image' };
      }

      const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);

      return {
        success: true,
        media: { id: `${timestamp}-${randomSuffix}`, type: 'image', url: publicUrlData.publicUrl, sortOrder: 0 },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Upload failed' };
    }
  }

  async uploadVideo(
    file: File,
    userId: string,
    purpose: 'post_video' | 'discover_video'
  ): Promise<UploadResult> {
    try {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
        return { success: false, error: `Video format .${extension} not supported. Use MP4, WebM, or MOV.` };
      }

      // 100MB max for Discover videos
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        return { 
            success: false, 
            error: `This video is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a video under 100MB. For best results, use a short vertical video (9:16, 1080x1920) between 3-60 seconds.` 
          };
      }

      // Get video metadata
      const metadata = await this.getVideoMetadata(file);

      // Duration validation for Discover
      if (purpose === 'discover_video' && metadata.duration > 0) {
        if (metadata.duration < 3) {
          return { 
            success: false, 
            error: `This video is too short (${metadata.duration.toFixed(1)} seconds). Please upload a video between 3-60 seconds for Discover.` 
          };
        }
        if (metadata.duration > 60) {
          return { 
            success: false, 
            error: `This video is too long (${metadata.duration.toFixed(1)} seconds). Please upload a video between 3-60 seconds. Short vertical videos work best for Discover!` 
          };
        }
      }

      // Dimension validation for Discover (require vertical 9:16)
      if (purpose === 'discover_video' && metadata.width > 0 && metadata.height > 0) {
        // Require portrait orientation
        if (metadata.height <= metadata.width) {
          return { 
            success: false, 
            error: `Please upload a vertical video (portrait). Your video is ${metadata.width}x${metadata.height}. A 9:16 vertical video (1080x1920) works best.` 
          };
        }

        // Check aspect ratio is close to 9:16
        const aspectRatio = metadata.width / metadata.height;
        if (aspectRatio < 0.4 || aspectRatio > 0.75) {
          return { 
            success: false, 
            error: `Aspect ratio should be close to 9:16. Your video is ${metadata.width}x${metadata.height}. Recommended: 1080x1920.` 
          };
        }
      }

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = extension || 'mp4';
      const filePath = `${purpose}/${userId}/${timestamp}-${randomSuffix}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'video/mp4' });

      if (uploadError) {
        return { success: false, error: 'Failed to upload video' };
      }

      const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);

      return {
        success: true,
        media: { 
          id: `${timestamp}-${randomSuffix}`, 
          type: 'video', 
          url: publicUrlData.publicUrl, 
          sortOrder: 0,
          width: metadata.width,
          height: metadata.height,
          durationSeconds: metadata.duration,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Video upload failed' };
    }
  }

  private async getVideoMetadata(file: File): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const timeout = setTimeout(() => {
        window.URL.revokeObjectURL(video.src);
        resolve({ duration: 0, width: 0, height: 0 });
      }, 10000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const result = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        };
        setTimeout(() => window.URL.revokeObjectURL(video.src), 1000);
        resolve(result);
      };

      video.onerror = () => {
        clearTimeout(timeout);
        window.URL.revokeObjectURL(video.src);
        resolve({ duration: 0, width: 0, height: 0 });
      };

      video.src = URL.createObjectURL(file);
    });
  }

  async uploadMultipleImages(
    files: File[],
    userId: string,
    purpose: 'post_image' | 'avatar' | 'cover_photo'
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await this.uploadImage(file, userId, purpose);
      results.push(result);
    }
    return results;
  }
}

export const mediaService = new MediaService();

