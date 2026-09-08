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

class UploadService {
  async uploadFile(
    file: File,
    purpose: UploadPurpose,
    userId: string
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
      const fileExtension = file.name.split('.').pop();
      const filePath = `${purpose}/${userId}/${timestamp}-${randomSuffix}.${fileExtension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

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
