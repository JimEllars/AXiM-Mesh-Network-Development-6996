import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import ComponentErrorBoundary from '../common/ComponentErrorBoundary';
import { useMeshTelemetry } from '../services/telemetryService';

const { FiMaximize2, FiMoreHorizontal, FiRadio, FiRefreshCw, FiLayers } = FiIcons;

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
  const [hoveredLink, setHoveredLink] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

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
          <button aria-label="Toggle Coverage" onClick={() => setShowHeatmap(!showHeatmap)} className={showHeatmap ? 'active' : ''} style={showHeatmap ? { color: 'var(--lime)', background: 'rgba(184, 243, 74, 0.1)' } : {}}>
            <SafeIcon icon={FiLayers} />
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

          {showHeatmap && topologyNodes.map((node, idx) => {
            let radius = '22%';
            let fill = 'rgba(98, 168, 255, 0.06)';
            let stroke = 'rgba(98, 168, 255, 0.2)';

            if (node.core) {
              radius = '28%';
              fill = 'rgba(184, 243, 74, 0.08)';
              stroke = 'rgba(184, 243, 74, 0.25)';
            } else if (node.warning) {
              radius = '18%';
              fill = 'rgba(255, 172, 102, 0.08)';
              stroke = 'rgba(255, 172, 102, 0.25)';
            }

            return (
              <motion.circle
                key={`heat-${node.id}`}
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={fill}
                stroke={stroke}
                strokeWidth="0.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.4, 1, 0.4], scale: 1 }}
                transition={{ duration: 3, repeat: Infinity, delay: idx * 0.2, ease: "easeInOut" }}
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

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
                className={`${node.warning ? 'warning-line' : 'subtle-line'} ${hoveredLink?.id === node.id ? 'hovered-link' : ''}`}
                onMouseEnter={() => setHoveredLink(node)}
                onMouseLeave={() => setHoveredLink(null)}
                style={{ strokeWidth: hoveredLink?.id === node.id ? 2 : 1, transition: 'all 0.3s' }}
              />
            );
          })}
        </svg>
        {hoveredLink && !hoveredLink.core && (() => {
          const coreNode = topologyNodes.find(n => n.core) || { x: 49, y: 53 };
          const midX = (hoveredLink.x + coreNode.x) / 2;
          const midY = (hoveredLink.y + coreNode.y) / 2;
          return (
            <motion.div
              className="topology-tooltip"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: 'absolute',
                left: `${midX}%`,
                top: `${midY}%`,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(16, 24, 39, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '8px 12px',
                borderRadius: '6px',
                color: 'white',
                fontSize: '11px',
                zIndex: 10,
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#60a5fa' }}>Link: {hoveredLink.id} &lt;-&gt; Core</div>
              <div>Latency: {hoveredLink.latency}</div>
              <div>SNR: {hoveredLink.snr || '+9.2 dB'}</div>
              <div>Status: {hoveredLink.status}</div>
            </motion.div>
          );
        })()}
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
