/**
 * Verification Service
 * Handles identity verification submission and status.
 */

import { supabase } from '@/config/supabase.client';

export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export interface VerificationRequest {
  id: string;
  user_id: string;
  status: VerificationStatus;
  method: string;
  selfie_url: string | null;
  id_document_url: string | null;
  id_document_type: string | null;
  country_code: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface SubmitInput {
  userId: string;
  selfieFile: File;
  idFile: File;
  idDocumentType: 'passport' | 'national_id' | 'drivers_license';
  countryCode: string;
}

class VerificationService {
  /**
   * Returns the most recent verification request for a user,
   * or null if they've never submitted one.
   */
  async getMyLatestVerification(userId: string): Promise<VerificationRequest | null> {
    const { data, error } = await supabase
      .from('identity_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as VerificationRequest;
  }

  /**
   * Uploads a selfie + ID to the private 'verification' bucket
   * and creates the identity_verifications row (status = 'pending').
   */
  async submit(input: SubmitInput): Promise<{ success: boolean; error?: string }> {
    const { userId, selfieFile, idFile, idDocumentType, countryCode } = input;
    const ts = Date.now();

    // ---- 1. Selfie upload ----
    const selfiePath = `${userId}/selfie-${ts}.jpg`;
    const { error: selfieError } = await supabase.storage
      .from('verification')
      .upload(selfiePath, selfieFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: selfieFile.type,
      });

    if (selfieError) {
      return { success: false, error: `Selfie upload failed: ${selfieError.message}` };
    }

    // ---- 2. ID document upload ----
    const idExt = idFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const idPath = `${userId}/id-${ts}.${idExt}`;
    const { error: idError } = await supabase.storage
      .from('verification')
      .upload(idPath, idFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: idFile.type,
      });

    if (idError) {
      // Clean up the selfie if the ID upload fails
      await supabase.storage.from('verification').remove([selfiePath]);
      return { success: false, error: `ID upload failed: ${idError.message}` };
    }

    // ---- 3. Create the verification row ----
    const { error: insertError } = await supabase
      .from('identity_verifications')
      .insert({
        user_id: userId,
        status: 'pending',
        method: 'selfie_and_id',
        selfie_url: selfiePath,        // storage path, NOT a public URL
        id_document_url: idPath,
        id_document_type: idDocumentType,
        country_code: countryCode,
        submitted_at: new Date().toISOString(),
      });

    if (insertError) {
      await supabase.storage.from('verification').remove([selfiePath, idPath]);
      return { success: false, error: `Failed to save verification: ${insertError.message}` };
    }

    return { success: true };
  }

  /**
   * Admin-only: returns a 5-minute signed URL for the given storage path.
   */
  /**
   * Reads the admin-configured example selfie URL from verification_settings.
   * Returns null if no example has been uploaded yet.
   */
  async getSelfieExampleUrl(): Promise<string | null> {
    const { data, error } = await supabase
      .from('verification_settings')
      .select('value')
      .eq('key', 'selfie_example_url')
      .maybeSingle();

    if (error || !data) return null;
    return data.value ?? null;
  }

  async getSignedUrl(path: string): Promise<string | null> {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from('verification')
      .createSignedUrl(path, 300);   // 5 minutes

    if (error || !data) return null;
    return data.signedUrl;
  }
}

export const verificationService = new VerificationService();