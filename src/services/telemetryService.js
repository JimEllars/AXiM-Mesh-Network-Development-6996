import { useState, useEffect, useCallback } from 'react';
import { nodes as initialNodes, metrics as initialMetrics, activity as initialActivity } from '../data/networkData';
import { loadSecurityEvents } from '../data/securityEvents';

let isEdgeReady = false;

export const setEdgeReady = (ready) => {
  isEdgeReady = ready;
};

export const useMeshTelemetry = () => {
  const [nodes] = useState(initialNodes);
  const [metrics] = useState(initialMetrics);
  const [activity] = useState(initialActivity);
  const [securityEvents] = useState(loadSecurityEvents());
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

    // In a real scenario, this would update nodes, metrics, etc.
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
