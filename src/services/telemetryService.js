import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { nodes as initialNodes, metrics as initialMetrics, activity as initialActivity } from '../data/networkData';
import { loadSecurityEvents, securityEventsStorageKey } from '../data/securityEvents';

let isEdgeReady = false;

export const setEdgeReady = (ready) => {
  isEdgeReady = ready;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';
const edgeWorkerUrl = import.meta.env.VITE_EDGE_WORKER_URL || 'http://localhost:8787';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MAX_BUFFER_SIZE = 100;
const TELEMETRY_STORAGE_KEY = 'axim-telemetry-buffer';

let localBuffer = [];
try {
  const stored = window.localStorage.getItem(TELEMETRY_STORAGE_KEY);
  if (stored) {
    localBuffer = JSON.parse(stored);
  }
} catch (e) {
  // ignore
}

const saveBuffer = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(localBuffer));
  }
};

const pushToBuffer = (event) => {
  localBuffer.push(event);
  if (localBuffer.length > MAX_BUFFER_SIZE) {
    localBuffer.shift(); // Ring buffer
  }
  saveBuffer();
};

export const subscribeToMeshTelemetry = (onNodeUpdate, onSecurityEvent) => {
  const channel = supabase.channel('mesh-telemetry');

  if (onNodeUpdate) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'mesh_nodes' }, (payload) => {
      onNodeUpdate(payload.new);
    });
  }

  if (onSecurityEvent) {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mesh_security_events' }, (payload) => {
      onSecurityEvent(payload.new);
    });
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

let _activity = [...initialActivity];
let _nodes = [...initialNodes];
let _securityEvents = loadSecurityEvents();
let listeners = new Set();

let telemetryUnsubscribe = null;
if (typeof window !== 'undefined') {
  telemetryUnsubscribe = subscribeToMeshTelemetry(
    (newNodeData) => {
      _nodes = _nodes.map(n => n.id === newNodeData.id ? { ...n, ...newNodeData } : n);
      if (!_nodes.find(n => n.id === newNodeData.id)) {
        _nodes = [..._nodes, newNodeData];
      }
      notifyListeners();
    },
    (newEventData) => {
      updateSecurityEvents(current => [newEventData, ...current]);
    }
  );
}

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export const emitTelemetryEvent = (event) => {
  const newEvent = { ...event, timestamp: new Date().toISOString() };
  pushToBuffer(newEvent);

  if (event.type === 'activity') {
    _activity = [event.data, ..._activity];
    notifyListeners();
  }
};

export const registerNode = (nodeData) => {
  _nodes = [..._nodes, nodeData];

  if (isEdgeReady) {
    fetch(`${edgeWorkerUrl}/api/nodes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodeData)
    }).catch(() => {
      emitTelemetryEvent({ type: 'node_register', data: nodeData });
    });
  } else {
    emitTelemetryEvent({ type: 'node_register', data: nodeData });
  }

  notifyListeners();
};

export const forceSyncTelemetry = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const start = Date.now();
    const response = await fetch(`${edgeWorkerUrl}/api/telemetry/health`, { method: 'GET', signal: controller.signal }).catch(() => ({ ok: false }));
    clearTimeout(timeoutId);

    if (response && response.ok) {
      isEdgeReady = true;
      let edgeColo = 'LOCAL';
      try {
        const data = await response.clone().json();
        edgeColo = data.edgeColo || 'LOCAL';
      } catch (e) {
        // ignore
      }


      // Fetch nodes from edge and merge
      try {
        const nodesController = new AbortController();
        const nodesTimeout = setTimeout(() => nodesController.abort(), 5000);
        const nodesResponse = await fetch(`${edgeWorkerUrl}/api/nodes`, { method: 'GET', signal: nodesController.signal });
        clearTimeout(nodesTimeout);
        if (nodesResponse.ok) {
          const { nodes } = await nodesResponse.json();
          if (nodes && nodes.length > 0) {
            let updated = false;
            nodes.forEach(edgeNode => {
              if (!_nodes.find(n => n.id === edgeNode.id)) {
                _nodes = [..._nodes, edgeNode];
                updated = true;
              }
            });
            if (updated) notifyListeners();
          }
        }
      } catch (err) {
        console.error('Error fetching edge nodes:', err);
      }

      // Try to flush buffer
      if (localBuffer.length > 0) {
        const eventsToSync = [...localBuffer];
        const normalEvents = eventsToSync.filter(e => e.type !== 'node_register');
        const registerEvents = eventsToSync.filter(e => e.type === 'node_register');

        // Handle normal events
        if (normalEvents.length > 0) {
          try {
            const ingestController = new AbortController();
            const ingestTimeout = setTimeout(() => ingestController.abort(), 5000);
            await fetch(`${edgeWorkerUrl}/api/telemetry/ingest`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ events: normalEvents }),
              signal: ingestController.signal
            });
            clearTimeout(ingestTimeout);
          } catch (e) {
            // Ignore error so we don't break the loop
          }
        }

        // Handle node register events
        for (const ev of registerEvents) {
          try {
            const regController = new AbortController();
            const regTimeout = setTimeout(() => regController.abort(), 5000);
            await fetch(`${edgeWorkerUrl}/api/nodes/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ev.data),
              signal: regController.signal
            }).catch(() => {});
            clearTimeout(regTimeout);
          } catch (e) {
            // ignore
          }
        }

        localBuffer = [];
        saveBuffer();
      }

      return { ok: true, latency: Date.now() - start, queuedCount: localBuffer.length, edgeColo };
    }
  } catch (e) {
    isEdgeReady = false;
    return { ok: false };
  }
  return { ok: false };
};

export const updateSecurityEvents = (updater) => {
  _securityEvents = typeof updater === 'function' ? updater(_securityEvents) : updater;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(securityEventsStorageKey, JSON.stringify(_securityEvents));
  }

  const eventTrace = { type: 'security_event_update', data: _securityEvents, timestamp: new Date().toISOString() };
  emitTelemetryEvent({ type: 'security_event_update', data: _securityEvents });

  if (isEdgeReady) {
    fetch(`${edgeWorkerUrl}/api/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [eventTrace] })
    }).catch(() => {});
  }

  notifyListeners();
}


let _messages = [
  { id: '1', channel: '#public', callsign: 'W7AW', payload: 'Testing new backbone route via SOTA repeater', rssi: -82, snr: 8.5, hops: 2, timestamp: new Date(Date.now() - 50000).toISOString() },
  { id: '2', channel: '#public', callsign: 'K6XYZ', payload: 'Copy that. Signal strong in socal.', rssi: -71, snr: 12.0, hops: 3, timestamp: new Date(Date.now() - 30000).toISOString() }
];

export const sendMeshMessage = (channel, payload, passToken = null) => {
  const newMsg = {
    id: Math.random().toString(36).substring(2, 9),
    channel,
    callsign: 'OP-LOCAL',
    payload,
    rssi: -50,
    snr: 15.0,
    hops: 0,
    timestamp: new Date().toISOString()
  };

  _messages = [..._messages, newMsg];

  emitTelemetryEvent({
    type: 'activity',
    data: {
      title: `Message transmitted on ${channel}`,
      meta: 'Just now',
      type: 'info'
    }
  });

  if (isEdgeReady) {
    const packet = {
      type: 'packet',
      channel,
      passToken,
      data: newMsg
    };

    fetch(`${edgeWorkerUrl}/api/v1/mesh/ingress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet)
    }).catch(() => {});
  }

  notifyListeners();
};

export const useMeshMessages = () => {
  const [messages, setMessages] = useState(_messages);

  useEffect(() => {
    const listener = () => {
      setMessages([..._messages]);
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  return { messages, sendMeshMessage };
};

export const useMeshTelemetry = () => {

  const [state, setState] = useState({
    nodes: _nodes,
    metrics: initialMetrics,
    activity: _activity,
    securityEvents: _securityEvents,
    ping: 3,
    isEdgeReady
  });

  useEffect(() => {
    const listener = () => {
      const onlineNodes = _nodes.filter(n => n.status === 'Online');
      const onlineCount = onlineNodes.length;
      const totalNodes = _nodes.length;
      const meshHealth = totalNodes > 0 ? ((onlineCount / totalNodes) * 100).toFixed(2) + '%' : '0.00%';
      const totalClients = _nodes.reduce((sum, n) => sum + (n.clients || 0), 0);
      const throughputGbps = ((totalClients * 4.5) / 1000).toFixed(2); // Mock throughput derivation

      const dynamicMetrics = [
        {
          label: 'Active nodes',
          value: onlineCount.toString(),
          detail: `of ${totalNodes} total`,
          change: 'Stable',
          icon: 'Radio',
          tone: 'lime'
        },
        {
          label: 'Mesh health',
          value: meshHealth,
          detail: 'Current uptime',
          change: 'Optimal',
          icon: 'Heart',
          tone: 'blue'
        },
        {
          label: 'Throughput',
          value: throughputGbps,
          unit: 'Gbps',
          detail: 'Estimated capacity',
          change: 'Active',
          icon: 'Zap',
          tone: 'violet'
        },
        {
          label: 'Active clients',
          value: totalClients.toLocaleString(),
          detail: 'across active nodes',
          change: 'Tracking',
          icon: 'Users',
          tone: 'orange'
        }
      ];

      setState(prev => ({
        ...prev,
        nodes: _nodes,
        metrics: dynamicMetrics,
        activity: _activity,
        securityEvents: _securityEvents
      }));
    };

    // Call once to initialize dynamic metrics
    listener();

    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  return {
    ...state,
    updateSecurityEvents
  };
};

export const useTelemetryStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toISOString());
  const [queuedCount, setQueuedCount] = useState(localBuffer.length);
  const [edgeColo, setEdgeColo] = useState('LOCAL');

  const transportMode = isConnected ? 'edge' : 'buffer';

  const fetchWithBackoff = async (url, options, maxRetries = 3, initialDelay = 1000) => {
    let delay = initialDelay;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const start = Date.now();
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Response not ok');
        return { response, latency: Date.now() - start };
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  };

  useEffect(() => {
    let interval;

    let timeoutId;

    const checkHealthAndFlush = async () => {
      try {
        const result = await forceSyncTelemetry();
        if (result && result.ok) {
          setIsConnected(true);
          setLatencyMs(result.latency);
          setLastSyncTime(new Date().toISOString());
          if (result.edgeColo) setEdgeColo(result.edgeColo);
        } else {
          setIsConnected(false);
        }
      } catch (e) {
        setIsConnected(false);
      } finally {
        setQueuedCount(localBuffer.length);
        const nextInterval = Math.floor(Math.random() * (45000 - 30000 + 1)) + 30000;
        timeoutId = setTimeout(checkHealthAndFlush, nextInterval);
      }
    };

    checkHealthAndFlush();

    // Periodically update queued count if buffer changes from other sources
    const bufferCheckInterval = setInterval(() => {
      setQueuedCount(localBuffer.length);
    }, 1000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(bufferCheckInterval);
    };
  }, []);

  return { isConnected, latencyMs, transportMode, lastSyncTime, queuedCount, edgeColo };
};

export const getNodes = () => initialNodes;
export const getMetrics = () => initialMetrics;
export const getActivity = () => initialActivity;
export const getSecurityEvents = loadSecurityEvents;

export const verifyAccessPass = async (passToken, nodeId) => {
  try {
    const response = await fetch(`${edgeWorkerUrl}/api/v1/mesh/auth/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passToken, nodeId })
    });
    if (response.ok) {
      return await response.json();
    }
    return { authorized: false, reason: 'Request failed' };
  } catch (error) {
    return { authorized: false, reason: 'Network error' };
  }
};
