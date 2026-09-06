import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import { defaultRFProfile } from '../data/networkData';
import { registerNode, emitTelemetryEvent } from '../services/telemetryService';

const handshakeStages = [
  {
    label: 'Enrollment profile',
    detail: 'Preparing secure node credentials',
    icon: 'Key'
  },
  {
    label: 'Gateway handshake',
    detail: 'Establishing encrypted gateway link',
    icon: 'Link'
  },
  {
    label: 'Mesh verification',
    detail: 'Validating route and node identity',
    icon: 'Shield'
  },
  {
    label: 'Node activation',
    detail: 'Adding endpoint to live topology',
    icon: 'Radio'
  }
];

function DeployModal({
  onClose,
  onComplete,
  onFailure,
  initialNodeName = 'AX-NODE-253',
  initialZone = 'Central campus'
}) {
const [nodeName, setNodeName] = useState(initialNodeName);
  const [zone, setZone] = useState(initialZone);
  const [cidr, setCidr] = useState('');
  const [gateway, setGateway] = useState('Auto-assign');
  const [stage, setStage] = useState(-1);
  const [attempt, setAttempt] = useState(1);
  const [startedAt, setStartedAt] = useState(null);
  const [error, setError] = useState('');

  const deploying = stage >= 0 && stage < handshakeStages.length;
  const complete = stage === handshakeStages.length;
  const failed = stage === -2;

  const progress = complete
    ? 100
    : failed
      ? 48
      : stage < 0
        ? 0
        : Math.round(((stage + 0.55) / handshakeStages.length) * 100);

  useEffect(() => {
    if (!deploying) return undefined;

    const timer = window.setTimeout(() => {
      if (stage === 1 && attempt === 1) {
        setStage(-2);
        onFailure?.({
          id: `${nodeName}-${Date.now()}`,
          nodeName: nodeName.trim(),
          zone,
          status: 'Failed',
          stages: stage + 1,
          duration: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
          completedAt: new Date().toISOString()
        });
        return;
      }

      setStage((current) => current + 1);
    }, 1050);

    return () => window.clearTimeout(timer);
  }, [attempt, deploying, nodeName, onFailure, stage, startedAt, zone]);

  useEffect(() => {
    if (!complete || !startedAt) return;

    const newNode = {
      id: nodeName.trim(),
      region: zone,
      status: 'Online',
      load: 0,
      latency: '0 ms',
      clients: 0,
      profile: defaultRFProfile
    };

    registerNode(newNode);

    emitTelemetryEvent({
      type: 'activity',
      data: {
        title: 'New node enrolled and verified',
        meta: `${nodeName.trim()} · ${zone} · Just now`,
        type: 'success'
      }
    });

    onComplete?.({
      id: `${nodeName}-${Date.now()}`,
      nodeName: nodeName.trim(),
      zone,
      status: 'Verified',
      stages: handshakeStages.length,
      duration: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      completedAt: new Date().toISOString()
    });
  }, [complete, nodeName, onComplete, startedAt, zone]);

  const statusLabel = useMemo(() => {
    if (complete) return 'Handshake complete';
    if (failed) return 'Handshake interrupted';
    if (deploying) return `Step ${stage + 1} of ${handshakeStages.length}`;
    return 'Network expansion';
  }, [complete, deploying, failed, stage]);

  const beginDeployment = () => {
    if (!nodeName.trim()) {
      setError('Enter a node name to continue.');
      return;
    }
    const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))$/;
    if (cidr && !cidrRegex.test(cidr)) {
      setError('Enter a valid CIDR assignment (e.g. 10.0.0.0/24).');
      return;
    }

    setError('');
    setAttempt(1);
    setStartedAt(Date.now());
    setStage(0);
  };

  const retryDeployment = () => {
    setError('');
    setAttempt((current) => current + 1);
    setStartedAt(Date.now());
    setStage(0);
  };

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Deploy node">
      <motion.div
        className="modal-card deploy-card"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <SafeIcon name="X" />
        </button>

        {stage < 0 && !failed && (
          <>
            <div className="modal-icon"><SafeIcon name="Radio" /></div>
            <p className="eyebrow">{statusLabel}</p>
            <h2>Deploy a new node</h2>
            <p className="modal-intro">
              Generate a secure enrollment profile and track its live mesh handshake.
            </p>

            <label>
              Node name
              <input
                value={nodeName}
                onChange={(event) => setNodeName(event.target.value)}
              />
            </label>

            <label>
              Deployment zone
              <select value={zone} onChange={(event) => setZone(event.target.value)}>
                <option>Central campus</option>
                <option>North campus</option>
                <option>East district</option>
                <option>West campus</option>
              </select>
            </label>

            <label>
              IP CIDR Assignment
              <input
                placeholder="e.g. 10.0.0.0/24"
                value={cidr}
                onChange={(event) => setCidr(event.target.value)}
              />
            </label>

            <label>
              Gateway Assignment
              <select value={gateway} onChange={(event) => setGateway(event.target.value)}>
                <option>Auto-assign</option>
                <option>Central Gateway</option>
                <option>North Gateway</option>
                <option>East Gateway</option>
                <option>West Gateway</option>
              </select>
            </label>

            {error && <p className="form-error">{error}</p>}

            <button className="primary-button modal-submit" onClick={beginDeployment}>
              Start secure handshake
            </button>
          </>
        )}

        {deploying && (
          <HandshakeProgress
            nodeName={nodeName}
            zone={zone}
            stage={stage}
            progress={progress}
            attempt={attempt}
          />
        )}

        {failed && (
          <RetryState
            nodeName={nodeName}
            zone={zone}
            attempt={attempt}
            onRetry={retryDeployment}
            onCancel={onClose}
          />
        )}

        {complete && (
          <div className="deploy-success">
            <div className="complete-check"><SafeIcon name="CheckCircle" /></div>
            <p className="eyebrow">Handshake complete</p>
            <h2>{nodeName} is verified</h2>
            <p>
              Secure enrollment finished for {zone}. The node is ready to join the live topology.
            </p>
            <div className="handshake-result">
              <span><SafeIcon name="Shield" /> Identity verified</span>
              <span><SafeIcon name="Lock" /> Link encrypted</span>
            </div>
            <button className="primary-button" onClick={onClose}>
              Return to network
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function HandshakeProgress({ nodeName, zone, stage, progress, attempt }) {
  return (
    <div className="handshake-progress">
      <div className="handshake-header">
        <div className="modal-icon"><SafeIcon name="RefreshCw" /></div>
        <div>
          <p className="eyebrow">Live deployment · Attempt {attempt}</p>
          <h2>Tracking handshake</h2>
        </div>
      </div>

      <p className="handshake-node">{nodeName} <span>·</span> {zone}</p>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <div className="progress-meta">
        <span>Secure provisioning</span>
        <strong>{progress}%</strong>
      </div>

      <div className="handshake-steps">
        {handshakeStages.map((item, index) => {
          const active = index === stage;
          const finished = index < stage;

          return (
            <div
              className={`handshake-step ${active ? 'active' : ''} ${finished ? 'finished' : ''}`}
              key={item.label}
            >
              <span className="step-icon">
                <SafeIcon name={finished ? 'Check' : item.icon} />
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{active ? 'In progress' : item.detail}</small>
              </span>
              {active && <i className="step-pulse" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RetryState({ nodeName, zone, attempt, onRetry, onCancel }) {
  return (
    <div className="retry-state">
      <div className="retry-icon"><SafeIcon name="AlertTriangle" /></div>
      <p className="eyebrow">Handshake interrupted</p>
      <h2>Gateway did not respond</h2>
      <p className="modal-intro">
        The encrypted gateway link for {nodeName} could not be established in {zone}.
        No node credentials were activated.
      </p>

      <div className="retry-diagnostic">
        <span><SafeIcon name="XCircle" /> Gateway response timeout</span>
        <span><SafeIcon name="Shield" /> Existing network unchanged</span>
        <small>Retry attempt {attempt + 1} will re-negotiate the gateway session.</small>
      </div>

      <div className="retry-actions">
        <button className="secondary-button" onClick={onCancel}>Cancel</button>
        <button className="primary-button" onClick={onRetry}>
          <SafeIcon name="RefreshCw" />
          Retry handshake
        </button>
      </div>
    </div>
  );
}

export default DeployModal;