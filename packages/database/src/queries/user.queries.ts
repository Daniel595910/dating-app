/**
 * User Database Queries
 * Type-safe database operations for users and profiles
 */

import { SupabaseService, handleDatabaseError } from '../supabase';
import type { User, Profile, CreateProfileInput, UpdateProfileInput } from '@dating-app/types';

export class UserQueries {
  private service: SupabaseService;
  
  constructor(service ? : SupabaseService) {
    this.service = service || SupabaseService.getInstance();
  }
  
  async getUserById(userId: string): Promise < User | null > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data as User | null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async getUserByEmail(email: string): Promise < User | null > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) throw error;
      return data as User | null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async getProfileByUserId(userId: string): Promise < Profile | null > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data as Profile | null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async createProfile(input: CreateProfileInput): Promise < Profile > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('profiles')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async updateProfile(userId: string, input: UpdateProfileInput): Promise < Profile > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('profiles')
        .update(input)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async deleteProfile(userId: string): Promise < void > {
    try {
      const { error } = await this.service
        .getClient()
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      handleDatabaseError(error);
    }
  }
  
  async searchProfiles(searchTerm: string, limit = 20): Promise < Profile[] > {
    try {
      const { data, error } = await this.service
        .getClient()
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as Profile[];
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}