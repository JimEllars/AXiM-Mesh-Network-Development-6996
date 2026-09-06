import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { nodes as initialNodes, metrics as initialMetrics, activity as initialActivity } from '../data/networkData';
import { loadSecurityEvents } from '../data/securityEvents';

let isEdgeReady = false;

export const setEdgeReady = (ready) => {
  isEdgeReady = ready;
};

// We will construct this client with placeholder values for now, but in reality
// these would be injected via environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function subscribeToMeshTelemetry(onNodeUpdate, onSecurityEvent) {
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
}

export const useMeshTelemetry = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [metrics] = useState(initialMetrics);
  const [activity] = useState(initialActivity);
  const [securityEvents, setSecurityEvents] = useState(loadSecurityEvents());
  const [ping, setPing] = useState(3);

  const fetchTelemetry = useCallback(async () => {
    if (isEdgeReady) {
      try {
        const response = await fetch('/api/telemetry');
        if (response.ok) {
          await response.json();
          // Update state with edge data...
        }
      } catch (error) {
        console.error("Failed to fetch edge telemetry, falling back to mock", error);
      }
    }

    // Simulate live ping
    setPing(prev => Math.max(1, prev + (Math.random() * 2 - 1)));
  }, []);

  useEffect(() => {
    // Attempt live subscription
    const unsubscribe = subscribeToMeshTelemetry(
      (newNodeData) => {
        setNodes(current => {
          const index = current.findIndex(n => n.id === newNodeData.id);
          if (index > -1) {
            const next = [...current];
            next[index] = { ...next[index], ...newNodeData };
            return next;
          }
          return [...current, newNodeData];
        });
      },
      (newEventData) => {
        setSecurityEvents(current => [newEventData, ...current]);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  return {
    nodes,
    metrics,
    activity,
    securityEvents,
    ping: Math.round(ping),
    isEdgeReady
  };
};

export const getNodes = () => initialNodes;
export const getMetrics = () => initialMetrics;
export const getActivity = () => initialActivity;
export const getSecurityEvents = loadSecurityEvents;
