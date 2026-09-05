import { supabase } from '@/config/supabase.client';
import { PostMedia } from '../types/community.types';

interface UploadResult {
  success: boolean;
  media?: PostMedia;
  error?: string;
}

class MediaService {
  /**
   * Upload a file through the secure backend flow.
   * Never expose Backblaze secrets directly in the browser.
   */
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
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { success: false, error: 'Failed to upload image' };
      }

      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const media: PostMedia = {
        id: `${timestamp}-${randomSuffix}`,
        type: 'image',
        url: publicUrlData.publicUrl,
        sortOrder: 0,
      };

      return { success: true, media };
    } catch (err: any) {
      console.error('Media upload error:', err);
      return { success: false, error: err.message || 'Upload failed' };
    }
  }

  /**
   * Upload a video file for posts/discover
   */
  async uploadVideo(
    file: File,
    userId: string,
    purpose: 'post_video' | 'discover_video'
  ): Promise<UploadResult> {
    try {
      // Validate video file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        return { success: false, error: `Video type ${file.type} not allowed. Use MP4 or WebM.` };
      }

      // Validate file size (100MB max for videos)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        return { success: false, error: 'Video file size exceeds 100MB limit' };
      }

      // Validate duration (15-30 seconds recommended for Discover)
      const duration = await this.getVideoDuration(file);
      if (purpose === 'discover_video' && duration > 0) {
        if (duration < 5) {
          return { success: false, error: 'Video must be at least 5 seconds long' };
        }
        if (duration > 60) {
          return { success: false, error: 'Video must be 60 seconds or less for Discover' };
        }
      }

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.name.split('.').pop() || 'mp4';
      const filePath = `${purpose}/${userId}/${timestamp}-${randomSuffix}.${fileExtension}`;

      // Upload video
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Video upload error:', uploadError);
        return { success: false, error: 'Failed to upload video' };
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const media: PostMedia = {
        id: `${timestamp}-${randomSuffix}`,
        type: 'video',
        url: publicUrlData.publicUrl,
        sortOrder: 0,
      };

      return { success: true, media };
    } catch (err: any) {
      console.error('Video upload error:', err);
      return { success: false, error: err.message || 'Video upload failed' };
    }
  }

  /**
   * Get video duration in seconds
   */
  private async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => {
        resolve(0);
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
