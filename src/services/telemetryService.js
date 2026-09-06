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
  const channel = supabase
    .channel('mesh-telemetry')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mesh_nodes' }, (payload) => {
      if (onNodeUpdate) onNodeUpdate(payload.new);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mesh_security_events' }, (payload) => {
      if (onSecurityEvent) onSecurityEvent(payload.new);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

let _activity = [...initialActivity];
let _nodes = [...initialNodes];
let _securityEvents = loadSecurityEvents();
let listeners = new Set();

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
  emitTelemetryEvent({ type: 'node_register', data: nodeData });
  notifyListeners();
};

export const updateSecurityEvents = (updater) => {
  _securityEvents = typeof updater === 'function' ? updater(_securityEvents) : updater;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(securityEventsStorageKey, JSON.stringify(_securityEvents));
  }
  notifyListeners();
}

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
      setState(prev => ({
        ...prev,
        nodes: _nodes,
        activity: _activity,
        securityEvents: _securityEvents
      }));
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToMeshTelemetry(
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

    return () => {
      if (unsubscribe) unsubscribe();
    };
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

    const checkHealthAndFlush = async () => {
      try {
        const { response, latency } = await fetchWithBackoff(`${edgeWorkerUrl}/api/health`, { method: 'GET' });
        setIsConnected(true);
        setLatencyMs(latency);
        setLastSyncTime(new Date().toISOString());

        // Try to flush buffer
        if (localBuffer.length > 0) {
          const eventsToSync = [...localBuffer];
          const flushResponse = await fetch(`${edgeWorkerUrl}/api/telemetry/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: eventsToSync })
          });
          if (flushResponse.ok) {
            localBuffer = [];
            saveBuffer();
          }
        }
      } catch (e) {
        setIsConnected(false);
      }
      setQueuedCount(localBuffer.length);
    };

    checkHealthAndFlush();
    interval = setInterval(checkHealthAndFlush, 5000);

    // Periodically update queued count if buffer changes from other sources
    const bufferCheckInterval = setInterval(() => {
      setQueuedCount(localBuffer.length);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(bufferCheckInterval);
    };
  }, []);

  return { isConnected, latencyMs, transportMode, lastSyncTime, queuedCount };
};

export const getNodes = () => initialNodes;
export const getMetrics = () => initialMetrics;
export const getActivity = () => initialActivity;
export const getSecurityEvents = loadSecurityEvents;
