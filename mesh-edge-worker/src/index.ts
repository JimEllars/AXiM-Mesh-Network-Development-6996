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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/v1/mesh/ingress' && request.method === 'POST') {
      return handleIngress(request, env);
    }

    if (url.pathname === '/api/v1/mesh/action' && request.method === 'GET') {
      return handleAction(request, env);
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(generateBriefing(env));
  }
};

async function handleIngress(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('X-Axim-Signature');
  if (signature !== env.AXIM_INTERNAL_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload = await request.json();

    // Connect to Supabase to insert packets and update node metrics
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

    // Simple example: persisting packet
    if (payload.type === 'packet') {
      await supabase.from('mesh_packets').insert([payload.data]);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response('Bad Request', { status: 400 });
  }
}

async function handleAction(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const decision = url.searchParams.get('decision');

  if (!token || !decision) {
    return new Response('Invalid request', { status: 400 });
  }

  const tokenData = await env.MESH_STATE_KV.get(`action_${token}`);
  if (!tokenData) {
    return new Response('Token expired or invalid', { status: 403 });
  }

  // Perform the action (failover or isolate)
  // e.g. update routing in KV or Supabase
  await env.MESH_STATE_KV.put(`route_${Date.now()}`, decision);

  // Mark token as used
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
    headers: { 'Content-Type': 'text/html' }
  });
}

async function generateBriefing(env: Env) {
  const token = crypto.randomUUID();
  // 24-hour TTL (86400 seconds)
  await env.MESH_STATE_KV.put(`action_${token}`, JSON.stringify({ created: Date.now() }), { expirationTtl: 86400 });

  const workerDomain = 'mesh-worker.axim.workers.dev'; // Assuming placeholder domain

  const dateStr = new Date().toISOString().split('T')[0];
  const subject = `[AXiM Mesh Network Briefing] Daily RF Backbone Health & Node Telemetry - ${dateStr}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #121212; color: #e0e0e0; padding: 20px; border-radius: 8px;">
      <h2 style="color: #fff;">AXiM Mesh Network Briefing</h2>
      <p>Daily RF Backbone Health & Node Telemetry - ${dateStr}</p>

      <table style="width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="border-bottom: 1px solid #333;"><th style="padding: 8px;">Metric</th><th style="padding: 8px;">Value</th></tr>
        <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px;">Total Packets Relayed</td><td style="padding: 8px;">1,420,953</td></tr>
        <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px;">Airtime Utilization</td><td style="padding: 8px;">42%</td></tr>
        <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px;">Avg Hop Count</td><td style="padding: 8px;">2.4</td></tr>
        <tr style="border-bottom: 1px solid #333;"><td style="padding: 8px;">Low Battery Nodes</td><td style="padding: 8px; color: #ff6b6b;">2</td></tr>
      </table>

      <h3 style="color: #ff6b6b;">Action Required (HITL)</h3>
      <p><strong>Node:</strong> AX-EAST-12 (East District)</p>
      <p><strong>Issue:</strong> High Utilization / Potential Jamming</p>

      <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
        <a href="https://${workerDomain}/api/v1/mesh/action?token=${token}&decision=failover" style="display: block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px; text-align: center; border-radius: 4px; font-weight: bold;">[ Trigger Gateway Failover ]</a>
        <a href="https://${workerDomain}/api/v1/mesh/action?token=${token}&decision=isolate" style="display: block; background: #ef4444; color: #fff; text-decoration: none; padding: 12px; text-align: center; border-radius: 4px; font-weight: bold;">[ Isolate Jammed Node ]</a>
        <a href="https://mesh.axim.us.com" style="display: block; background: #4b5563; color: #fff; text-decoration: none; padding: 12px; text-align: center; border-radius: 4px; font-weight: bold;">[ Inspect Topology in Cockpit ]</a>
      </div>
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
