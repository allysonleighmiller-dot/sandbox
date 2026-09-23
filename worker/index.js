// Cloudflare Worker: proxies outfit/closet photos and closet data to Claude's
// API and returns AI suggestions. Keeps the Anthropic API key server-side (it
// can never live in the static frontend) and adds permissive CORS so the
// GitHub Pages app can call it directly.
//
// Modes (POST body `mode` field):
//   "tag_outfit"      (default) - image + mediaType -> { category, tags }
//   "tag_item"        - image + mediaType -> { type, tags }
//   "suggest_outfits" - closetItems + inspiration -> { outfits }
//
// Deploy: see ../README.md "Auto-tag setup" section.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-5';

const CATEGORIES = ['Casual', 'Work', 'Date Night', 'Formal', 'Athleisure', 'Loungewear', 'Other'];
const ITEM_TYPES = ['Top', 'Bottom', 'Dress', 'Outerwear', 'Shoes', 'Bag', 'Accessory', 'Other'];

const OUTFIT_TAGGING_TOOL = {
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

const ITEM_TAGGING_TOOL = {
  name: 'suggest_item_tags',
  description: 'Suggest the garment type and descriptive tags for a photo of one clothing item.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ITEM_TYPES,
        description: 'The single best-fit garment type for this item.',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Exactly 2-6 short lowercase tags: color(s), material, and style descriptors (e.g. "white", "cotton", "oversized", "cropped").',
      },
    },
    required: ['type', 'tags'],
    additionalProperties: false,
  },
};

const SUGGEST_TOOL = {
  name: 'suggest_outfits',
  description:
    'Suggest outfit combinations built only from the given owned clothing items, inspired by the given style references.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      outfits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'A short 2-5 word name for this outfit combo.' },
            item_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of the owned items used in this combo, from the provided list.',
            },
            reason: {
              type: 'string',
              description:
                'One short sentence on why these items work together, referencing the inspiration(s) it draws from when relevant.',
            },
          },
          required: ['title', 'item_ids', 'reason'],
          additionalProperties: false,
        },
        description: '3-5 distinct outfit combinations.',
      },
    },
    required: ['outfits'],
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

async function callClaude(env, { tools, messages, effort, maxTokens }) {
  const anthropicRes = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort },
      tools,
      tool_choice: { type: 'auto' },
      messages,
    }),
  });

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text();
    const err = new Error(`Anthropic API error (${anthropicRes.status})`);
    err.detail = detail;
    throw err;
  }

  const data = await anthropicRes.json();
  const toolUse = (data.content || []).find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error('Claude did not return a tool result');
  }
  return toolUse.input;
}

async function handleTagRequest(request, env, origin, mode) {
  const payload = await request.json().catch(() => null);
  const { image, mediaType } = payload || {};
  if (!image || typeof image !== 'string') {
    return jsonResponse({ error: 'Missing "image" (base64 string)' }, 400, origin);
  }
  if (!mediaType || typeof mediaType !== 'string') {
    return jsonResponse({ error: 'Missing "mediaType" (e.g. "image/jpeg")' }, 400, origin);
  }

  const isItem = mode === 'tag_item';
  const tool = isItem ? ITEM_TAGGING_TOOL : OUTFIT_TAGGING_TOOL;
  const instruction = isItem
    ? 'This is a photo of a single clothing item for a personal wardrobe app. ' +
      'Call suggest_item_tags with its garment type and 2-6 tags.'
    : 'This is a photo of a clothing outfit for a personal wardrobe app. ' +
      'Call suggest_outfit_tags with your best category and 3-8 tags for it.';

  const input = await callClaude(env, {
    tools: [tool],
    effort: 'low',
    maxTokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: instruction },
        ],
      },
    ],
  });

  return jsonResponse(isItem ? { type: input.type, tags: input.tags } : { category: input.category, tags: input.tags }, 200, origin);
}

async function handleSuggestRequest(request, env, origin) {
  const payload = await request.json().catch(() => null);
  const closetItems = Array.isArray(payload?.closetItems) ? payload.closetItems : [];
  const inspiration = Array.isArray(payload?.inspiration) ? payload.inspiration : [];

  if (closetItems.length === 0) {
    return jsonResponse({ error: 'No closet items provided' }, 400, origin);
  }

  const itemLines = closetItems
    .map((item) => `- id: ${item.id} | type: ${item.type} | tags: ${(item.tags || []).join(', ')}${item.notes ? ` | notes: ${item.notes}` : ''}`)
    .join('\n');

  const inspirationLines = inspiration.length
    ? inspiration
        .map((o) => `- category: ${o.category} | tags: ${(o.tags || []).join(', ')}${o.notes ? ` | notes: ${o.notes}` : ''}`)
        .join('\n')
    : '(none provided - base suggestions on the closet items alone)';

  const promptText =
    'You are helping style outfits for a personal wardrobe app.\n\n' +
    "Here are the clothing items the user actually owns (each with a stable id you must reference exactly):\n" +
    `${itemLines}\n\n` +
    'Here are outfit looks the user has saved as style inspiration (their taste, not items they own):\n' +
    `${inspirationLines}\n\n` +
    'Call suggest_outfits with 3-5 distinct outfit combinations built ONLY from the owned items above ' +
    '(reference each by its exact id). Prefer combinations that reflect the style/colors/vibe of the ' +
    'inspiration looks where possible. Each outfit should make practical sense (e.g. one top + one bottom ' +
    'or one dress, not two tops).';

  const input = await callClaude(env, {
    tools: [SUGGEST_TOOL],
    effort: 'medium',
    maxTokens: 2048,
    messages: [{ role: 'user', content: [{ type: 'text', text: promptText }] }],
  });

  return jsonResponse({ outfits: input.outfits }, 200, origin);
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

    let mode = 'tag_outfit';
    try {
      const clone = await request.clone().json();
      if (clone && typeof clone.mode === 'string') mode = clone.mode;
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    try {
      if (mode === 'tag_outfit' || mode === 'tag_item') {
        return await handleTagRequest(request, env, origin, mode);
      }
      if (mode === 'suggest_outfits') {
        return await handleSuggestRequest(request, env, origin);
      }
      return jsonResponse({ error: `Unknown mode "${mode}"` }, 400, origin);
    } catch (err) {
      return jsonResponse({ error: err.message || String(err), detail: err.detail }, 502, origin);
    }
  },
};
