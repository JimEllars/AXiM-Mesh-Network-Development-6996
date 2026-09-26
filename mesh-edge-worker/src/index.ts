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

    if (url.pathname === '/api/telemetry/health' && request.method === 'GET') {
      const loadFactor = Math.floor(Math.random() * (45 - 20 + 1)) + 20;
      return new Response(JSON.stringify({
        status: "operational",
        timestamp: new Date().toISOString(),
        edgeColo: request.cf?.colo || 'LOCAL',
        meshLoadFactor: loadFactor
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
        const events = payload.events || [];

        let currentRelayed = parseInt((await env.MESH_STATE_KV.get('metrics:packets_relayed')) || '0', 10);
        currentRelayed += events.length;
        await env.MESH_STATE_KV.put('metrics:packets_relayed', currentRelayed.toString());

        let recentEventsStr = await env.MESH_STATE_KV.get('recent_telemetry_events');
        let recentEvents = recentEventsStr ? JSON.parse(recentEventsStr) : [];
        recentEvents = [...events, ...recentEvents].slice(0, 50);
        await env.MESH_STATE_KV.put('recent_telemetry_events', JSON.stringify(recentEvents));

        return new Response(JSON.stringify({ success: true, processed: events.length }), {
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

    if (url.pathname === '/api/nodes' && request.method === 'GET') {
      try {
        const indexStr = await env.MESH_STATE_KV.get('index:nodes');
        const nodeIds = indexStr ? JSON.parse(indexStr) : [];
        let nodes = [];

        for (const id of nodeIds) {
          const nodeData = await env.MESH_STATE_KV.get(`node:${id}`);
          if (nodeData) {
            nodes.push(JSON.parse(nodeData));
          }
        }

        // If empty, return an empty array (fallback handled on the client or here if needed, but array is fine)
        return new Response(JSON.stringify({ nodes }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch(e) {
         return new Response(JSON.stringify({ error: 'Internal Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (url.pathname === '/api/nodes/register' && request.method === 'POST') {
      try {
        const payload = await request.json() as any;
        if (payload.id) {
          await env.MESH_STATE_KV.put(`node:${payload.id}`, JSON.stringify(payload), { expirationTtl: 2592000 });

          let indexStr = await env.MESH_STATE_KV.get('index:nodes');
          let nodeIds = indexStr ? JSON.parse(indexStr) : [];
          if (!nodeIds.includes(payload.id)) {
            nodeIds.push(payload.id);
            await env.MESH_STATE_KV.put('index:nodes', JSON.stringify(nodeIds));
          }
        }
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


    if (url.pathname === '/api/v1/mesh/auth/verify-access' && request.method === 'POST') {
      try {
        const payload = await request.json() as any;
        const { passToken, nodeId } = payload;

        if (!passToken || !nodeId) {
           return new Response(JSON.stringify({ authorized: false, reason: "Missing token or node ID" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const passDataStr = await env.MESH_STATE_KV.get(`pass:${passToken}`);

        if (passDataStr) {
          const passData = JSON.parse(passDataStr);
          // Assuming simple expiration check based on data.expiresAt or KV TTL handles it
          return new Response(JSON.stringify({
            authorized: true,
            expiresAt: passData.expiresAt || new Date(Date.now() + 86400000).toISOString(),
            tier: passData.tier || "daily"
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } else {
          return new Response(JSON.stringify({ authorized: false, reason: "Invalid or expired access pass" }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({ authorized: false, reason: "Bad Request" }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }


    if (url.pathname === '/api/v1/mesh/dlq/flush' && request.method === 'POST') {
      if (request.headers.get('X-Axim-Signature') !== env.AXIM_INTERNAL_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      try {
        const { keys } = await env.MESH_DLQ_KV.list();
        let reprocessedCount = 0;
        let remainingInDlq = keys.length;

        for (const key of keys) {
          const item = await env.MESH_DLQ_KV.get(key.name);
          if (item) {
            const payload = JSON.parse(item);
            const success = await sendEmailItMessage(env, payload.to, payload.bcc, payload.subject, payload.html);
            if (success) {
              await env.MESH_DLQ_KV.delete(key.name);
              reprocessedCount++;
              remainingInDlq--;
            }
          }
        }

        return new Response(JSON.stringify({ success: true, reprocessedCount, remainingInDlq }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
    }


    if (url.pathname === '/api/v1/mesh/checkout/webhook' && request.method === 'POST') {
      try {
        const payload = await request.json();
        if (payload.type === 'checkout.session.completed') {
           const session = payload.data.object;
           const nodeId = session.client_reference_id || 'unknown';
           const tier = session.metadata?.tier || 'daily';

           const token = `AXPASS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

           let ttl = 86400;
           if (tier === 'weekly') ttl = 604800;
           if (tier === 'monthly') ttl = 2592000;

           const createdAt = new Date().toISOString();
           const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

           await env.MESH_STATE_KV.put(`pass:${token}`, JSON.stringify({ token, tier, nodeId, createdAt, expiresAt }), { expirationTtl: ttl });

           return new Response(JSON.stringify({ received: true, passToken: token }), {
             status: 200,
             headers: { 'Content-Type': 'application/json', ...corsHeaders }
           });
        }
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response('Bad Request', { status: 400, headers: corsHeaders });
      }
    }

    if (url.pathname === '/api/v1/mesh/analytics' && request.method === 'GET') {
       const timeframe = url.searchParams.get('timeframe') || '12h';

       const relayedStr = await env.MESH_STATE_KV.get('metrics:packets_relayed') || '0';
       const packetsRelayed = parseInt(relayedStr, 10);

       let steps = 6;
       let labels = [];
       if (timeframe === '12h') {
           steps = 6;
           labels = ['00:00', '04:00', '08:00', '12:00', '16:00', 'Now'];
       } else if (timeframe === '24h') {
           steps = 5;
           labels = ['00:00', '06:00', '12:00', '18:00', 'Now'];
       } else if (timeframe === '7d') {
           steps = 7;
           labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Now'];
       } else {
           steps = 6;
       }

       const dataBuckets = [];
       let totalDuty = 0;
       let totalSnr = 0;
       let totalThroughput = 0;
       let totalError = 0;

       for (let i = 0; i < steps; i++) {
           const bucket = {
               label: labels[i] || `T-${steps - i}`,
               dutyCyclePct: 15 + Math.random() * 20 + (packetsRelayed % 5),
               averageSnr: 8 + Math.random() * 5,
               throughputKbps: 45 + Math.random() * 50 + (packetsRelayed % 10),
               errorRatePct: 1 + Math.random() * 3
           };
           dataBuckets.push(bucket);
           totalDuty += bucket.dutyCyclePct;
           totalSnr += bucket.averageSnr;
           totalThroughput += bucket.throughputKbps;
           totalError += bucket.errorRatePct;
       }

       const summary = {
           dutyCyclePct: totalDuty / steps,
           averageSnr: totalSnr / steps,
           throughputKbps: totalThroughput / steps,
           errorRatePct: totalError / steps
       };

       return new Response(JSON.stringify({ success: true, timeframe, dataBuckets, summary }), {
           status: 200,
           headers: { 'Content-Type': 'application/json', ...corsHeaders }
       });
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

  let payload: any;
  try {
    payload = await request.json();
  } catch (err) {
    return new Response('Bad Request', { status: 400, headers: corsHeaders });
  }


  const snr = payload.snr !== undefined ? payload.snr : (payload.data && payload.data.snr !== undefined ? payload.data.snr : 0);
  const packetLoss = payload.packetLoss !== undefined ? payload.packetLoss : (payload.data && payload.data.packetLoss !== undefined ? payload.data.packetLoss : 0);
  const nodeId = payload.nodeId || (payload.data && payload.data.nodeId) || 'UNKNOWN-NODE';

  if (snr < -5 || packetLoss > 35) {
    const anomalyId = `SEC-${Date.now().toString().slice(-4)}`;
    const anomalyRecord = {
      id: anomalyId,
      title: `RF Jamming / High Noise on ${nodeId}`,
      severity: 'High',
      source: nodeId,
      detectedAt: new Date().toISOString(),
      status: 'Open'
    };

    try {
      const eventsStr = await env.MESH_STATE_KV.get('recent_telemetry_events') || '[]';
      const events = JSON.parse(eventsStr);
      events.unshift(anomalyRecord);
      if (events.length > 50) events.pop();
      await env.MESH_STATE_KV.put('recent_telemetry_events', JSON.stringify(events));

      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
      await supabase.from('mesh_security_events').insert([anomalyRecord]);
    } catch (err) {
      console.error('Failed to register anomaly', err);
    }
  }
  const isEmergency = payload.channel === 'emergency';
  const isInternal = signature === env.AXIM_INTERNAL_KEY;

  if (!isEmergency && !isInternal) {
    const passToken = payload.passToken;
    if (!passToken) {
      return new Response(JSON.stringify({ error: "Access pass required or expired", status: "rejected" }), {
        status: 402,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const passDataStr = await env.MESH_STATE_KV.get(`pass:${passToken}`);
    if (!passDataStr) {
      return new Response(JSON.stringify({ error: "Access pass required or expired", status: "rejected" }), {
        status: 402,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    try {
      const passData = JSON.parse(passDataStr);
      if (passData.expiresAt && new Date(passData.expiresAt).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: "Access pass required or expired", status: "rejected" }), {
          status: 402,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    } catch(e) {
      return new Response(JSON.stringify({ error: "Access pass required or expired", status: "rejected" }), {
        status: 402,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

    if (payload.type === 'packet') {
      await supabase.from('mesh_packets').insert([payload.data]);
    }

    // Record airtime metrics in MESH_STATE_KV
    let relayedStr = await env.MESH_STATE_KV.get('metrics:packets_relayed');
    let relayedCount = parseInt(relayedStr || '0', 10) + 1;
    await env.MESH_STATE_KV.put('metrics:packets_relayed', relayedCount.toString());

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err) {
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
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

  const packetsRelayed = (await env.MESH_STATE_KV.get('metrics:packets_relayed')) || '0';
  const indexStr = await env.MESH_STATE_KV.get('index:nodes');
  const nodeIds = indexStr ? JSON.parse(indexStr) : [];

  let lowBatteryRepeaters = 0;
  for (const id of nodeIds) {
    const nodeStr = await env.MESH_STATE_KV.get(`node:${id}`);
    if (nodeStr) {
      const node = JSON.parse(nodeStr);
      // Mock logic: assuming node data has battery property if it's a repeater
      if (node.battery && node.battery < 20) {
        lowBatteryRepeaters++;
      }
    }
  }

  // Calculate generic airtime utilization mock
  const airtimeUtilization = (Math.min(100, (parseInt(packetsRelayed) / 10000) * 100)).toFixed(1);

  const workerDomain = 'mesh-worker.axim.workers.dev';

  const dateStr = new Date().toISOString().split('T')[0];
  const subject = `[AXiM Mesh Network Briefing] Daily RF Backbone Health & Node Telemetry - ${dateStr}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #121212; color: #e0e0e0; padding: 20px; border-radius: 8px;">
      <h2 style="color: #fff;">AXiM Mesh Network Briefing</h2>
      <p>Daily RF Backbone Health & Node Telemetry - ${dateStr}</p>
      <table style="width: 100%; text-align: left; margin-top: 20px; border-collapse: collapse;">
        <tr>
          <th style="padding: 8px; border-bottom: 1px solid #333;">Metric</th>
          <th style="padding: 8px; border-bottom: 1px solid #333;">Value</th>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #333;">Packets Relayed</td>
          <td style="padding: 8px; border-bottom: 1px solid #333;">${packetsRelayed}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #333;">Active Nodes</td>
          <td style="padding: 8px; border-bottom: 1px solid #333;">${nodeIds.length}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #333;">24h Airtime Utilization</td>
          <td style="padding: 8px; border-bottom: 1px solid #333;">${airtimeUtilization}%</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #333;">Repeaters < 20% Battery</td>
          <td style="padding: 8px; border-bottom: 1px solid #333;">${lowBatteryRepeaters}</td>
        </tr>
      </table>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #333;">
        <h3 style="color: #ff6b6b; margin-bottom: 8px;">Action Required (HITL Decision Layer)</h3>
        <p style="font-size: 13px; color: #aeb7c5;">
          ${lowBatteryRepeaters > 0
            ? `Alert: ${lowBatteryRepeaters} repeater(s) reporting critical battery (< 20%). Review routing failover.`
            : 'High Utilization / Anomaly Routing: Verify gateway balance or isolate unresponsive nodes.'}
        </p>
        <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 10px;">
          <a href="https://${workerDomain}/api/v1/mesh/action?token=${token}&decision=failover" style="display: block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px; text-align: center; border-radius: 6px; font-weight: bold; font-size: 13px;">[ Trigger Gateway Failover ]</a>
          <a href="https://${workerDomain}/api/v1/mesh/action?token=${token}&decision=isolate" style="display: block; background: #ef4444; color: #fff; text-decoration: none; padding: 12px; text-align: center; border-radius: 6px; font-weight: bold; font-size: 13px;">[ Isolate Anomaly Node ]</a>
          <a href="https://mesh.axim.us.com" style="display: block; background: #262f3d; color: #cbd3df; text-decoration: none; padding: 12px; text-align: center; border-radius: 6px; font-weight: bold; font-size: 13px;">[ Inspect Topology in Cockpit ]</a>
        </div>
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