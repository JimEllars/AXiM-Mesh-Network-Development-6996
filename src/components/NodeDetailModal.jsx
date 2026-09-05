import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';

function NodeDetailModal({ node, onClose }) {
  if (!node) return null;

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label={`${node.id} details`}>
      <motion.div className="modal-card node-detail-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <SafeIcon name="X" />
        </button>
        <div className={`node-detail-icon ${node.status.toLowerCase()}`}>
          <SafeIcon name="Radio" />
        </div>
        <p className="eyebrow">Node diagnostics</p>
        <h2>{node.id}</h2>
        <p className="modal-intro">{node.region} · Secure mesh endpoint</p>
        <div className="detail-grid">
          <Detail label="Status" value={node.status} />
          <Detail label="Current load" value={`${node.load}%`} />
          <Detail label="Latency" value={node.latency} />
          <Detail label="Connected clients" value={node.clients} />
        </div>
        <button className="primary-button modal-submit" onClick={onClose}>Close diagnostics</button>
      </motion.div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default NodeDetailModal;