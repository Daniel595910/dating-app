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

  async uploadVideo(
    file: File,
    userId: string,
    purpose: 'post_video' | 'discover_video'
  ): Promise<UploadResult> {
    try {
      // Accept all common video formats
      const allowedTypes = [
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
        'video/x-matroska', 'video/3gpp', 'video/3gpp2', 'video/mpeg',
        'video/ogg', 'video/x-flv', 'video/x-ms-wmv', 'application/octet-stream'
      ];
      
      // Also check by extension if type is octet-stream
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv', '3gp', '3g2', 'mpeg', 'mpg', 'ogg', 'ogv', 'flv', 'wmv', 'm4v', 'ts'];
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
        return { success: false, error: `Video format .${extension} not supported. Use MP4, WebM, or MOV.` };
      }

      const maxSize = 200 * 1024 * 1024; // 200MB max
      if (file.size > maxSize) {
        return { success: false, error: 'Video file size exceeds 200MB limit' };
      }

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = extension || 'mp4';
      const filePath = `${purpose}/${userId}/${timestamp}-${randomSuffix}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'video/mp4',
        });

      if (uploadError) {
        console.error('Video upload error:', uploadError);
        return { success: false, error: 'Failed to upload video' };
      }

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
