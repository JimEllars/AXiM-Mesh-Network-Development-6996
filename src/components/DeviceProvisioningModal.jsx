import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import ComponentErrorBoundary from '../common/ComponentErrorBoundary';
import { registerNode, emitTelemetryEvent } from '../services/telemetryService';
import { defaultRFProfile } from '../data/networkData';

const { FiX, FiBluetooth, FiCpu, FiCheckCircle, FiRefreshCw, FiZap } = FiIcons;

function DeviceProvisioningModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashedProfile, setFlashedProfile] = useState(defaultRFProfile);

  const simulateScan = async () => {
    setIsScanning(true);

    try {
      if (navigator.bluetooth) {
        const btDevice = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
        const idStr = btDevice.id ? btDevice.id.slice(-4).toUpperCase() : Math.floor(Math.random() * 900) + 100;
        setDevice({ name: btDevice.name || 'Unknown BLE Device', id: `AX-NODE-${idStr}`, mac: 'BLE-MAC-UNKNOWN' });
        setIsScanning(false);
        return;
      }
    } catch (error) {
      console.warn("Web Bluetooth failed or user cancelled, falling back to simulation.", error);
    }

    // Fallback
    setTimeout(() => {
      setDevice({ name: 'SenseCAP T1000', id: `AX-NODE-${Math.floor(Math.random() * 900) + 100}`, mac: '00:1A:2B:3C:4D:5E' });
      setIsScanning(false);
    }, 2000);
  };

  const handleFlash = () => {
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
      setStep(3);

      let currentProfile = { ...defaultRFProfile };
      try {
        const passDataStr = localStorage.getItem('axim_mesh_pass');
        if (passDataStr) {
          const passData = JSON.parse(passDataStr);
          if (passData && passData.token) {
            currentProfile.passToken = passData.token;
          }
        }
      } catch (e) { /* ignore */ }
      setFlashedProfile(currentProfile);
    }, 2500);
  };

  const handleRegister = () => {
    const newNode = {
      id: device.id,
      region: 'Sandbox',
      status: 'Online',
      load: 0,
      latency: '15 ms',
      clients: 0,
      profile: flashedProfile
    };
    registerNode(newNode);
    emitTelemetryEvent({
      type: 'activity',
      data: {
        title: 'New device provisioned',
        meta: `${device.name} · Sandbox · Just now`,
        type: 'success'
      }
    });
    onClose();
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
        <h2 style={{ marginBottom: '8px' }}>Device Provisioning & Radio Flasher</h2>
        <p className="modal-intro">Provision generic hardware to act as an edge repeater on the AXiM mesh.</p>

        {step === 1 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '30px 0' }}>
               <div style={{ background: isScanning ? 'rgba(98, 168, 255, 0.1)' : 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '50%', color: isScanning ? 'var(--blue)' : '#555', transition: 'all 0.3s' }}>
                  <SafeIcon icon={FiBluetooth} style={{ fontSize: '32px' }} className={isScanning ? 'spinning' : ''} />
               </div>
            </div>

            {!device ? (
              <button className="primary-button" style={{ width: '100%' }} onClick={simulateScan} disabled={isScanning}>
                {isScanning ? 'Scanning for BLE/Serial devices...' : 'Start Device Discovery'}
              </button>
            ) : (
              <div style={{ background: '#111721', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--lime)', fontSize: '14px' }}>{device.name}</strong>
                    <small style={{ color: '#8994a5' }}>MAC: {device.mac}</small>
                  </div>
                  <button className="primary-button" onClick={() => setStep(2)}>Select</button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
               <span style={{ color: '#8994a5' }}>Target: <strong style={{ color: '#fff' }}>{device.name}</strong></span>
               <span style={{ color: '#8994a5' }}>Assigned ID: <strong style={{ color: '#fff' }}>{device.id}</strong></span>
             </div>

             <div style={{ background: '#0b1018', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px', fontFamily: 'monospace', fontSize: '12px', color: '#aeb7c5' }}>
               <p><strong>RF Profile Locked Parameters:</strong></p>
               <ul style={{ listStyleType: 'none', padding: 0, marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                 <li>Freq: 927.875 MHz</li>
                 <li>SF: SF9</li>
                 <li>BW: 250 kHz</li>
                 <li>CR: 4/5</li>
                 <li>TX Power: +22 dBm</li>
                 <li>Key: AES-256</li>
               </ul>
             </div>

             <button className="primary-button" style={{ width: '100%' }} onClick={handleFlash} disabled={isFlashing}>
               {isFlashing ? (
                 <>
                   <SafeIcon icon={FiRefreshCw} className="spinning" />
                   Flashing Firmware...
                 </>
               ) : (
                 <>
                   <SafeIcon icon={FiZap} />
                   Flash RF Profile
                 </>
               )}
             </button>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <SafeIcon icon={FiCheckCircle} style={{ fontSize: '48px', color: 'var(--lime)', marginBottom: '16px' }} />
            <h3 style={{ color: '#fff', marginBottom: '8px' }}>Provisioning Complete</h3>
            <p style={{ color: '#8994a5', fontSize: '12px', marginBottom: '24px' }}>{device.name} ({device.id}) is flashed and ready. Registration will append it to the live mesh topology.</p>
            <button className="primary-button" onClick={handleRegister}>Verify & Register Node</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

const DeviceProvisioningModalErrorBoundary = (props) => (
  <ComponentErrorBoundary>
    <DeviceProvisioningModal {...props} />
  </ComponentErrorBoundary>
);

export default DeviceProvisioningModalErrorBoundary;
