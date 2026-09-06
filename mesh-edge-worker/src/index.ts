import { createClient } from '@supabase/supabase-js';
import { sendEmailItMessage } from './emailService';

export interface Env {
  AXIM_INTERNAL_KEY: string;
  EMAILIT_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  MESH_STATE_KV: KVNamespace;
  MESH_DLQ_KV: KVNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Axim-Signature',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        region: request.cf?.colo || 'local'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (url.pathname === '/api/telemetry/ingest' && request.method === 'POST') {
      try {
        const payload = await request.json() as any;
        // In a real app we'd validate the batch and store it in D1 or Supabase

        return new Response(JSON.stringify({ success: true, processed: payload.events?.length || 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Bad Request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (url.pathname === '/api/nodes/register' && request.method === 'POST') {
      try {
        const payload = await request.json() as any;
        return new Response(JSON.stringify({ success: true, node: payload }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Bad Request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (url.pathname === '/api/v1/mesh/ingress' && request.method === 'POST') {
      return handleIngress(request, env);
    }

    if (url.pathname === '/api/v1/mesh/action' && request.method === 'GET') {
      return handleAction(request, env);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(generateBriefing(env));
  }
};

async function handleIngress(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('X-Axim-Signature');
  if (signature !== env.AXIM_INTERNAL_KEY) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const payload: any = await request.json();

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

    if (payload.type === 'packet') {
      await supabase.from('mesh_packets').insert([payload.data]);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err) {
    return new Response('Bad Request', { status: 400, headers: corsHeaders });
  }
}

async function handleAction(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const decision = url.searchParams.get('decision');

  if (!token || !decision) {
    return new Response('Invalid request', { status: 400, headers: corsHeaders });
  }

  const tokenData = await env.MESH_STATE_KV.get(`action_${token}`);
  if (!tokenData) {
    return new Response('Token expired or invalid', { status: 403, headers: corsHeaders });
  }

  await env.MESH_STATE_KV.put(`route_${Date.now()}`, decision);
  await env.MESH_STATE_KV.delete(`action_${token}`);

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; background: #111; color: #fff; text-align: center; padding: 2rem; }
          .success { color: #4ade80; font-size: 1.5rem; }
        </style>
      </head>
      <body>
        <div class="success">Mesh Network Action Applied Successfully</div>
        <p>Decision: ${decision}</p>
      </body>
    </html>
  `;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html', ...corsHeaders }
  });
}

async function generateBriefing(env: Env) {
  const token = crypto.randomUUID();
  await env.MESH_STATE_KV.put(`action_${token}`, JSON.stringify({ created: Date.now() }), { expirationTtl: 86400 });

  const workerDomain = 'mesh-worker.axim.workers.dev';

  const dateStr = new Date().toISOString().split('T')[0];
  const subject = `[AXiM Mesh Network Briefing] Daily RF Backbone Health & Node Telemetry - ${dateStr}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #121212; color: #e0e0e0; padding: 20px; border-radius: 8px;">
      <h2 style="color: #fff;">AXiM Mesh Network Briefing</h2>
      <p>Daily RF Backbone Health & Node Telemetry - ${dateStr}</p>
      <!-- ... -->
    </div>
  `;

  await sendEmailItMessage(
    env,
    'james.ellars@axim.us.com',
    'jrellars@gmail.com',
    subject,
    html
  );
}
