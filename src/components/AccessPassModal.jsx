import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import ComponentErrorBoundary from '../common/ComponentErrorBoundary';
import { emitTelemetryEvent } from '../services/telemetryService';

const { FiX } = FiIcons;

function AccessPassModal({ onClose }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const passes = [
    {
      id: 'daily',
      name: 'Daily Pass',
      price: '$4.99',
      duration: '24-hour access key. Ideal for weekend field ops or emergency backup.'
    },
    {
      id: 'weekly',
      name: 'Weekly Pass',
      price: '$11.99',
      duration: '7-day access key. Structured for regional expeditions.'
    },
    {
      id: 'monthly',
      name: 'Monthly Access',
      price: '$19.99/mo',
      duration: 'Recurring subscription for continuous off-grid messaging and telemetry.'
    }
  ];

  const handleCheckout = () => {
    if (!selectedTier) return;
    setIsProcessing(true);
    setTimeout(() => {
      const token = `AXPASS-${Math.random().toString(16).substr(2, 4).toUpperCase()}-${Math.random().toString(16).substr(2, 4).toUpperCase()}`;

      let expiresInDays = 1;
      if (selectedTier.id === 'weekly') expiresInDays = 7;
      if (selectedTier.id === 'monthly') expiresInDays = 30;

      const passData = {
        token,
        tier: selectedTier.id,
        expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
        nodeId: null // bound later during provisioning
      };

      localStorage.setItem('axim_mesh_pass', JSON.stringify(passData));

      emitTelemetryEvent({
        type: 'activity',
        data: {
          title: `Access pass issued (${selectedTier.id.toUpperCase()})`,
          meta: `Token ${token} · Just now`,
          type: 'success'
        }
      });
      setIsProcessing(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" style={{ zIndex: 1000 }}>
      <motion.div
        className="modal-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button className="modal-close" onClick={onClose}>
          <SafeIcon icon={FiX} />
        </button>
        <h2 style={{ marginBottom: '8px' }}>AXiM Mesh Network Access Passes</h2>
        <p className="modal-intro">Select an off-grid pass tier to authorize your companion device on the AXiM 927.875 MHz repeater backbone.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '24px 0' }}>
          {passes.map((pass) => (
            <div
              key={pass.id}
              onClick={() => setSelectedTier(pass)}
              style={{
                background: selectedTier?.id === pass.id ? 'rgba(98, 168, 255, 0.1)' : '#111721',
                border: `1px solid ${selectedTier?.id === pass.id ? 'var(--blue)' : 'var(--border)'}`,
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ color: selectedTier?.id === pass.id ? '#fff' : '#e5e7eb', fontSize: '16px', display: 'block', marginBottom: '4px' }}>{pass.name}</strong>
                <p style={{ color: '#8994a5', fontSize: '12px', margin: 0 }}>{pass.duration}</p>
              </div>
              <div style={{ fontWeight: 'bold', color: 'var(--lime)', fontSize: '16px' }}>
                {pass.price}
              </div>
            </div>
          ))}
        </div>

        <button
          className="primary-button"
          style={{ width: '100%', opacity: !selectedTier || isProcessing ? 0.7 : 1 }}
          onClick={handleCheckout}
          disabled={!selectedTier || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Get Access Pass'}
        </button>
      </motion.div>
    </div>
  );
}

const AccessPassModalErrorBoundary = (props) => (
  <ComponentErrorBoundary>
    <AccessPassModal {...props} />
  </ComponentErrorBoundary>
);

export default AccessPassModalErrorBoundary;
