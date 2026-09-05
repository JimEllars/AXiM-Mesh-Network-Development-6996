import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiMaximize2, FiMoreHorizontal, FiRadio, FiRefreshCw } = FiIcons;

const topologyNodes = [
  { id: 'north', label: 'North', x: 49, y: 18, load: '68%' },
  { id: 'west', label: 'West', x: 19, y: 48, load: '54%' },
  { id: 'core', label: 'Core', x: 49, y: 53, load: '42%', core: true },
  { id: 'east', label: 'East', x: 79, y: 43, load: '89%', warning: true },
  { id: 'south', label: 'South', x: 54, y: 82, load: '37%' }
];

function NetworkTopology({ selected, onSelect, onRefresh, onFullscreen }) {
  const [refreshed, setRefreshed] = useState(false);

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
          <line x1="49" y1="18" x2="49" y2="53" />
          <line x1="19" y1="48" x2="49" y2="53" />
          <line x1="49" y1="53" x2="79" y2="43" className="warning-line" />
          <line x1="49" y1="53" x2="54" y2="82" />
          <line x1="19" y1="48" x2="54" y2="82" className="subtle-line" />
          <line x1="49" y1="18" x2="79" y2="43" className="subtle-line" />
        </svg>
        {topologyNodes.map((node, index) => (
          <motion.button
            key={node.id}
            className={`mesh-node ${node.core ? 'core' : ''} ${node.warning ? 'warning' : ''} ${selected === node.id ? 'selected' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => onSelect(node.id)}
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

export default NetworkTopology;