 * File Upload Edge Function
 * Handles secure file uploads to Backblaze B2
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FileUploadRequest {
  filename: string;
  content_type: string;
  file_size: number;
  purpose: 'avatar' | 'cover_photo' | 'post_image' | 'verification_document' | 'message_media';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: FileUploadRequest = await req.json();

    // Validate payload
    if (!payload.filename || !payload.content_type || !payload.file_size || !payload.purpose) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size based on purpose
    const maxSizes: Record<string, number> = {
      avatar: 5 * 1024 * 1024, // 5MB
      cover_photo: 10 * 1024 * 1024, // 10MB
      post_image: 10 * 1024 * 1024, // 10MB
      verification_document: 10 * 1024 * 1024, // 10MB
      message_media: 50 * 1024 * 1024, // 50MB
    };

    const maxSize = maxSizes[payload.purpose];
    if (!maxSize) {
      return new Response(
        JSON.stringify({ error: 'Invalid upload purpose' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.file_size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File size exceeds maximum allowed (${maxSize / 1024 / 1024}MB)` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'application/pdf',
    ];

    if (!allowedTypes.includes(payload.content_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = payload.filename.split('.').pop();
    const filePath = `${payload.purpose}/${user.id}/${timestamp}-${randomSuffix}.${fileExtension}`;

    // Get B2 credentials
    const b2KeyId = Deno.env.get('B2_APPLICATION_KEY_ID')!;
    const b2Key = Deno.env.get('B2_APPLICATION_KEY')!;
    const b2BucketName = Deno.env.get('B2_BUCKET_NAME')!;
    const b2Endpoint = Deno.env.get('B2_ENDPOINT') || 'https://s3.us-west-002.backblazeb2.com';

    // Generate upload URL (this is a placeholder - actual implementation would use B2 API)
    const uploadUrl = `${b2Endpoint}/${b2BucketName}/${filePath}`;

    // Create file record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        filename: payload.filename,
        file_path: filePath,
        content_type: payload.content_type,
        file_size: payload.file_size,
        purpose: payload.purpose,
        url: uploadUrl,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Upload URL generated',
        upload_url: uploadUrl,
        file_path: filePath,
        file_id: fileRecord.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in file-upload:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});