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
    purpose: 'post_video' | 'discover_video',
    onProgress?: (percent: number) => void
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

      // 1. Get Supabase session for Authorization header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/media/${filePath}`;

      // 2. Upload via XMLHttpRequest for progress tracking
      const uploadPromise = new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl, true);
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.setRequestHeader('apikey', anonKey);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        if (onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      try {
        await uploadPromise;
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to upload video' };
      }

      const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
      let thumbnailUrl: string | null = null;

      // 3. Generate and upload thumbnail
      try {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        
        await new Promise((resolve) => {
          video.onloadeddata = () => {
            video.currentTime = 0.1;
          };
          video.onseeked = resolve;
          video.onerror = resolve;
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx && canvas.width > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.7));
          if (blob) {
            const thumbPath = `${purpose}/${userId}/${timestamp}-${randomSuffix}-thumb.jpg`;
            const { error: thumbErr } = await supabase.storage.from('media').upload(thumbPath, blob, { contentType: 'image/jpeg' });
            if (!thumbErr) {
              const { data: thumbData } = supabase.storage.from('media').getPublicUrl(thumbPath);
              thumbnailUrl = thumbData.publicUrl;
            }
          }
        }
        URL.revokeObjectURL(video.src);
      } catch (thumbErr) {
        console.warn('Thumbnail generation failed', thumbErr);
      }

      return {
        success: true,
        media: {
          id: `${timestamp}-${randomSuffix}`,
          type: 'video',
          url: publicUrlData.publicUrl,
          thumbnailUrl: thumbnailUrl,
          sortOrder: 0,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Video upload failed' };
    }
  }
}

export const mediaService = new MediaService();