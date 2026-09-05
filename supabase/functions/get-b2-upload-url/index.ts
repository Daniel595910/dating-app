import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const B2_APPLICATION_KEY_ID = Deno.env.get('B2_APPLICATION_KEY_ID') || '';
const B2_APPLICATION_KEY = Deno.env.get('B2_APPLICATION_KEY') || '';
const B2_BUCKET_ID = Deno.env.get('B2_BUCKET_ID') || '';
const B2_ENDPOINT = Deno.env.get('B2_ENDPOINT') || '';

serve(async (req) => {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers });
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { fileName, fileType, userId, purpose } = await req.json();

    if (!fileName || !fileType) {
      return new Response(JSON.stringify({ error: 'fileName and fileType required' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Get Backblaze upload URL
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_get_upload_url', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${B2_APPLICATION_KEY_ID}:${B2_APPLICATION_KEY}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: B2_BUCKET_ID,
      }),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to get upload URL', details: authData }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const fileUrl = `${B2_ENDPOINT}/${authData.uploadUrl.split('/').pop()}/${fileName}`;

    return new Response(JSON.stringify({
      uploadUrl: authData.uploadUrl,
      authorizationToken: authData.authorizationToken,
      fileUrl,
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
