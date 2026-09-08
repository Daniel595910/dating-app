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
        media: {
          id: `${timestamp}-${randomSuffix}`,
          type: 'image',
          url: publicUrlData.publicUrl,
          sortOrder: 0,
        },
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
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['mp4', 'webm', 'mov', 'm4v'];
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
        return { success: false, error: `Video format .${extension} not supported` };
      }

      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        return { success: false, error: 'Video file size exceeds 100MB limit' };
      }

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filePath = `${purpose}/${userId}/${timestamp}-${randomSuffix}.${extension || 'mp4'}`;

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
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Video upload failed' };
    }
  }


}

export const mediaService = new MediaService();



