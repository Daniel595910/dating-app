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
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return { success: false, error: `File type ${file.type} not allowed` };
      }

      // Validate file size (10MB max for post images)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return { success: false, error: 'File size exceeds 10MB limit' };
      }

      // Generate unique file path
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filePath = `${purpose}/${userId}/${timestamp}-${randomSuffix}.${fileExtension}`;

      // Upload to Supabase Storage (which can be configured to use Backblaze)
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

      // Get public URL
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
