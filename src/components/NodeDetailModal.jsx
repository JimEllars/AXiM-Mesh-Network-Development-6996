import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { emitTelemetryEvent } from '../services/telemetryService';

function NodeDetailModal({ node, onClose }) {
  const [activeTab, setActiveTab] = useState('telemetry');
  const [pingStatus, setPingStatus] = useState('');

  if (!node) return null;

  const handlePing = () => {
    setPingStatus('Probe transmitted...');
    emitTelemetryEvent({
      type: 'activity',
      data: {
        title: `RF path ping echoed from ${node.id}`,
        meta: '1 hop · SNR +9.2 dB · Just now',
        type: 'success'
      }
    });
    setTimeout(() => {
      setPingStatus('');
    }, 3000);
  };

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

        <div className="tab-navigation" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}>
          <button
            style={{ background: 'none', border: 'none', color: activeTab === 'telemetry' ? 'var(--lime)' : '#657083', padding: '10px 0', borderBottom: activeTab === 'telemetry' ? '2px solid var(--lime)' : '2px solid transparent', cursor: 'pointer', fontSize: '12px' }}
            onClick={() => setActiveTab('telemetry')}
          >
            Operational Telemetry
          </button>
          <button
             style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? 'var(--lime)' : '#657083', padding: '10px 0', borderBottom: activeTab === 'profile' ? '2px solid var(--lime)' : '2px solid transparent', cursor: 'pointer', fontSize: '12px' }}
             onClick={() => setActiveTab('profile')}
          >
            RF Radio Baseline Profile
          </button>
        </div>

        {activeTab === 'telemetry' ? (
          <div className="detail-grid">
            <div className="detail-item">
               <span>Status</span>
               <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                 <span className="pulse-dot" style={{ background: node.status === 'Online' ? 'var(--lime)' : node.status === 'Warning' ? 'var(--orange)' : 'red', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }} />
                 {node.status}
               </strong>
            </div>
            <Detail label="Battery Voltage" value={
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                 4,120 mV <SafeIcon name="BatteryCharging" size={14} />
              </span>
            } />
            <Detail label="Power Input" value="5.2 V Solar Array (WisBlock Solar Base)" />
            <Detail label="Signal Link Quality" value="SNR: +9.2 dB, RSSI: -88 dBm, Hop Count: 1 of 4" />
            <Detail label="Traffic Performance" value={`Load ${node.load}%, Latency ${node.latency}, Connected Clients ${node.clients}`} />
          </div>
        ) : (
          <div className="detail-grid">
            <Detail label="Frequency" value={node.profile?.frequency || '927.875 MHz'} />
            <Detail label="Bandwidth" value={node.profile?.bandwidth || '250 kHz'} />
            <Detail label="Spreading Factor" value={node.profile?.spreadingFactor || 'SF9'} />
            <Detail label="Coding Rate" value={node.profile?.codingRate || '4/5'} />
            <Detail label="Transmit Power" value={node.profile?.txPower || '+22 dBm'} />
            <Detail label="Max Hops" value={`${node.profile?.maxHops || 4} hops`} />
            <Detail label="Operating Mode" value={node.profile?.role || 'Pure Router/Repeater'} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button className="primary-button modal-submit" style={{ marginTop: 0 }} onClick={onClose}>Close diagnostics</button>
          <button className="secondary-button" style={{ width: '100%' }} onClick={handlePing}>
            [ Ping Node (RF Path Probe) ]
          </button>
          {pingStatus && <span style={{ color: 'var(--lime)', fontSize: '11px', textAlign: 'center' }}>{pingStatus}</span>}
        </div>
      </motion.div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-item" style={{ marginBottom: '10px' }}>
      <span style={{ display: 'block', color: '#7d899b', fontSize: '10px', textTransform: 'uppercase' }}>{label}</span>
      <strong style={{ display: 'block', color: '#dce2ea', fontSize: '12px' }}>{value}</strong>
    </div>
  );
}

export default NodeDetailModal;
