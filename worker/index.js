// Cloudflare Worker: proxies an outfit photo to Claude's vision API and
// returns a suggested category + tags. Keeps the Anthropic API key server-side
// (it can never live in the static frontend) and adds permissive CORS so the
// GitHub Pages app can call it directly.
//
// Deploy: see ../README.md "Auto-tag setup" section.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-5';

const CATEGORIES = ['Casual', 'Work', 'Date Night', 'Formal', 'Athleisure', 'Loungewear', 'Other'];

const TAGGING_TOOL = {
  name: 'suggest_outfit_tags',
  description:
    'Suggest a category and short descriptive tags for a photo of a clothing outfit.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: CATEGORIES,
        description: 'The single best-fit category for this outfit.',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Exactly 3-8 short lowercase tags: dominant colors, garment types, and style/season descriptors (e.g. "denim", "olive green", "oversized blazer", "casual", "fall").',
      },
    },
    required: ['category', 'tags'],
    additionalProperties: false,
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse(
        { error: 'Server misconfigured: ANTHROPIC_API_KEY secret is not set.' },
        500,
        origin,
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    const { image, mediaType } = payload || {};
    if (!image || typeof image !== 'string') {
      return jsonResponse({ error: 'Missing "image" (base64 string)' }, 400, origin);
    }
    if (!mediaType || typeof mediaType !== 'string') {
      return jsonResponse({ error: 'Missing "mediaType" (e.g. "image/jpeg")' }, 400, origin);
    }

    let anthropicRes;
    try {
      anthropicRes = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          output_config: { effort: 'low' },
          tools: [TAGGING_TOOL],
          tool_choice: { type: 'auto' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
                {
                  type: 'text',
                  text:
                    'This is a photo of a clothing outfit for a personal wardrobe app. ' +
                    'Call suggest_outfit_tags with your best category and 3-8 tags for it.',
                },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      return jsonResponse({ error: `Failed to reach Anthropic API: ${err}` }, 502, origin);
    }

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text();
      return jsonResponse(
        { error: `Anthropic API error (${anthropicRes.status})`, detail },
        502,
        origin,
      );
    }

    const data = await anthropicRes.json();
    const toolUse = (data.content || []).find((block) => block.type === 'tool_use');

    if (!toolUse) {
      return jsonResponse({ error: 'Claude did not return a tagging result' }, 502, origin);
    }

    return jsonResponse(
      { category: toolUse.input.category, tags: toolUse.input.tags },
      200,
      origin,
    );
  },
};
