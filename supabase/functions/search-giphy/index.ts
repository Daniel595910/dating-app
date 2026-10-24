// Giphy search proxy — keeps the API key server-side
// Called from the admin panel (import GIFs) and from the user sticker picker (live search)

const GIPHY_API_KEY = Deno.env.get('GIPHY_API_KEY');
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height: GiphyImage;
    fixed_height_small: GiphyImage;
    fixed_height_still: GiphyImage;
    preview_gif: GiphyImage;
    downsized_medium: GiphyImage;
    original: GiphyImage;
  };
}

interface GiphyResponse {
  data: GiphyGif[];
  pagination: { total_count: number; count: number; offset: number };
  meta: { status: number; msg: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GIPHY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: GIPHY_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '24'), 50);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const endpoint = url.searchParams.get('endpoint') || 'search';

    let giphyUrl: string;
    if (endpoint === 'trending') {
      giphyUrl = GIPHY_BASE + '/trending?api_key=' + GIPHY_API_KEY + '&limit=' + limit + '&offset=' + offset + '&rating=pg-13';
    } else {
      if (!query.trim()) {
        return new Response(
          JSON.stringify({ error: 'Missing search query' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      giphyUrl = GIPHY_BASE + '/search?api_key=' + GIPHY_API_KEY + '&q=' + encodeURIComponent(query) + '&limit=' + limit + '&offset=' + offset + '&rating=pg-13&lang=en';
    }

    const giphyResp = await fetch(giphyUrl);
    if (!giphyResp.ok) {
      return new Response(
        JSON.stringify({ error: 'Giphy API error: ' + giphyResp.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: GiphyResponse = await giphyResp.json();

    // Normalize to the shape the app wants
    const results = (data.data || []).map((gif) => ({
      id: gif.id,
      title: gif.title || '',
      preview_url: gif.images.fixed_height_small?.url || gif.images.preview_gif?.url || gif.images.fixed_height_still?.url || '',
      gif_url: gif.images.fixed_height?.url || gif.images.downsized_medium?.url || gif.images.original?.url || '',
      full_url: gif.images.original?.url || '',
      width: parseInt(gif.images.fixed_height?.width || '200'),
      height: parseInt(gif.images.fixed_height?.height || '200'),
    }));

    return new Response(
      JSON.stringify({
        results,
        total: data.pagination?.total_count || results.length,
        count: results.length,
        offset,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('search-giphy error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
