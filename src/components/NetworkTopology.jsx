import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import ComponentErrorBoundary from '../common/ComponentErrorBoundary';
import { useMeshTelemetry } from '../services/telemetryService';

const { FiMaximize2, FiMoreHorizontal, FiRadio, FiRefreshCw } = FiIcons;

// Base coordinates for primary infrastructure
const baseCoordinates = {
  'AX-CORE-01': { x: 49, y: 53, core: true },
  'AX-NORTH-04': { x: 49, y: 18 },
  'AX-WEST-07': { x: 19, y: 48 },
  'AX-EAST-12': { x: 79, y: 43, warning: true },
  'AX-SOUTH-09': { x: 54, y: 82 }
};

// Generate random orbit coordinates for new nodes
const generateOrbit = (index) => {
  const angle = (index * 137.5) * (Math.PI / 180); // Golden ratio angle
  const radius = 35 + (index % 3) * 5; // Orbit radii
  return {
    x: Math.max(5, Math.min(95, 49 + Math.cos(angle) * radius)),
    y: Math.max(5, Math.min(95, 53 + Math.sin(angle) * radius))
  };
};

function NetworkTopology({ selected, onSelect, onRefresh, onFullscreen }) {
  const { nodes } = useMeshTelemetry();
  const [refreshed, setRefreshed] = useState(false);

  const topologyNodes = nodes.map((node, i) => {
    const coords = baseCoordinates[node.id] || generateOrbit(i);
    return {
      ...node,
      x: coords.x,
      y: coords.y,
      core: coords.core || false,
      warning: node.status === 'Warning' || coords.warning,
      label: node.id.replace('AX-', '')
    };
  });

  const refresh = () => {
    setRefreshed(true);
    onRefresh();
    window.setTimeout(() => setRefreshed(false), 1200);
  };

  return (
    <section className="panel topology-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Live infrastructure</p>
          <h2>Network topology</h2>
        </div>
        <div className="panel-actions">
          <button aria-label="Refresh" onClick={refresh} className={refreshed ? 'spinning' : ''}>
            <SafeIcon icon={FiRefreshCw} />
          </button>
          <button aria-label="Fullscreen" onClick={onFullscreen}>
            <SafeIcon icon={FiMaximize2} />
          </button>
          <button aria-label="More options" onClick={() => onRefresh()}>
            <SafeIcon icon={FiMoreHorizontal} />
          </button>
        </div>
      </div>
      <div className="topology-canvas">
        <svg className="mesh-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {topologyNodes.map((node) => {
            if (node.core) return null;
            const coreNode = topologyNodes.find(n => n.core) || { x: 49, y: 53 };
            return (
              <line
                key={`line-${node.id}`}
                x1={node.x}
                y1={node.y}
                x2={coreNode.x}
                y2={coreNode.y}
                className={node.warning ? 'warning-line' : 'subtle-line'}
              />
            );
          })}
        </svg>
        {topologyNodes.map((node, index) => (
          <motion.button
            key={node.id}
            className={`mesh-node ${node.core ? 'core' : ''} ${node.warning ? 'warning' : ''} ${selected === node.id ? 'selected' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => onSelect(node)}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.08 }}
          >
            <span className="node-icon"><SafeIcon icon={FiRadio} /></span>
            <strong>{node.label}</strong>
            <small>{node.load} load</small>
          </motion.button>
        ))}
      </div>
      <div className="topology-legend">
        <span><i className="healthy" /> Healthy</span>
        <span><i className="warning" /> Attention</span>
        <span><i className="link" /> Encrypted link</span>
      </div>
    </section>
  );
}


const NetworkTopologyWithErrorBoundary = (props) => (
  <ComponentErrorBoundary>
    <NetworkTopology {...props} />
  </ComponentErrorBoundary>
);

export default NetworkTopologyWithErrorBoundary;
