/**\n * Profile Service
 * Handles profile operations
 */

import { supabase } from '@/config/supabase.client';
import { Profile, UpdateProfileInput } from '@dating-app/types';

class ProfileService {
  async getProfileByUserId(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as Profile;
    } catch {
      return null;
    }
  }

  async getCurrentUserProfile(): Promise<Profile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      return await this.getProfileByUserId(user.id);
    } catch {
      return null;
    }
  }

  async updateProfile(
    userId: string,
    updates: UpdateProfileInput
  ): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    } catch {
      return null;
    }
  }

  async uploadAvatar(userId: string, file: File): Promise<string | null> {
    try {
      const filePath = `avatars/${userId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      await this.updateProfile(userId, { avatarUrl: publicUrl });

      return publicUrl;
    } catch {
      return null;
    }
  }

  async searchProfiles(searchTerm: string, limit = 20): Promise<Profile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
        .limit(limit);

      if (error) throw error;
      return (data || []) as Profile[];
    } catch {
      return [];
    }
  }
}

export const profileService = new ProfileService();
