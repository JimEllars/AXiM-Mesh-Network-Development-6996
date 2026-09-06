import React, { useMemo, useState } from 'react';
import SafeIcon from '../common/SafeIcon';

const gatewayOptions = [
  { name: 'East Gateway', region: 'East District', load: 89, latency: 21, clients: 318, status: 'Attention' },
  { name: 'North Gateway', region: 'North Campus', load: 68, latency: 8, clients: 472, status: 'Healthy' },
  { name: 'West Gateway', region: 'West Campus', load: 54, latency: 6, clients: 368, status: 'Healthy' },
  { name: 'Central Gateway', region: 'Central Hub', load: 42, latency: 3, clients: 684, status: 'Healthy' }
];

function GatewayFailoverPlanner({ onToast }) {
  const [source, setSource] = useState('East Gateway');
  const [target, setTarget] = useState('North Gateway');
  const [planned, setPlanned] = useState(false);
  const [approved, setApproved] = useState(false);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [approvedAt, setApprovedAt] = useState('');

  const sourceGateway = gatewayOptions.find((gateway) => gateway.name === source);
  const targetGateway = gatewayOptions.find((gateway) => gateway.name === target);

  const projectedLoad = useMemo(() => {
    if (!sourceGateway || !targetGateway) return 0;
    return Math.round(targetGateway.load + sourceGateway.load * 0.32);
  }, [sourceGateway, targetGateway]);

  const canPlan = source !== target && projectedLoad < 95;

  const planFailover = () => {
    if (!canPlan) return;
    setPlanned(true);
    setApproved(false);
    setCompleted(false);
    setApprovalNote('');
    setApprovedAt('');
    onToast?.('Failover plan generated and awaiting approval');
  };

  const approvePlan = () => {
    setApproved(true);
    setApprovedAt(new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }));
    onToast?.('Failover plan approved by Jordan Miller');
  };

  const rejectPlan = () => {
    setPlanned(false);
    setApproved(false);
    setApprovalNote('');
    setApprovedAt('');
    onToast?.('Failover plan rejected and returned to standby');
  };

  const executeFailover = () => {
    if (!approved) return;
    setRunning(true);
    window.setTimeout(() => {
      setRunning(false);
      setCompleted(true);
      onToast?.(`Failover executed: ${source} → ${target}`);
    }, 1150);
  };

  const resetPlan = () => {
    setPlanned(false);
    setApproved(false);
    setRunning(false);
    setCompleted(false);
    setApprovalNote('');
    setApprovedAt('');
  };

  return (
    <section className="panel workspace-panel failover-planner">
      <div className="workspace-panel-title failover-heading">
        <div>
          <p className="eyebrow">Resilience controls</p>
          <h3>Gateway failover planner</h3>
        </div>
        <span className={`failover-state ${completed ? 'complete' : approved ? 'approved' : planned ? 'planned' : ''}`}>
          <i />
          {completed ? 'Executed' : approved ? 'Approved' : planned ? 'Awaiting approval' : 'Standby'}
        </span>
      </div>

      <div className="failover-route">
        <GatewaySelect label="Failover source" value={source} onChange={setSource} exclude={target} warning />
        <div className="failover-arrow">
          <SafeIcon name={running ? 'RefreshCw' : 'ArrowRight'} />
        </div>
        <GatewaySelect label="Traffic destination" value={target} onChange={setTarget} exclude={source} />
      </div>

      <div className="failover-impact">
        <ImpactStat label="Clients moved" value={sourceGateway ? sourceGateway.clients.toLocaleString() : '—'} />
        <ImpactStat label="Projected load" value={`${projectedLoad}%`} warning={projectedLoad > 80} />
        <ImpactStat label="Route recovery" value="~18 sec" />
        <ImpactStat label="Encryption" value="Maintained" />
      </div>

      {!canPlan && (
        <p className="failover-warning">
          <SafeIcon name="AlertTriangle" />
          Choose two gateways with enough destination capacity.
        </p>
      )}

      {planned && !completed && (
        <div className={`approval-panel ${approved ? 'approved' : ''}`}>
          <div className="approval-heading">
            <span className="approval-icon"><SafeIcon name={approved ? 'CheckCircle' : 'Shield'} /></span>
            <div>
              <strong>{approved ? 'Plan approved for execution' : 'Approval required before execution'}</strong>
              <small>{source} → {target} · projected destination load {projectedLoad}%</small>
            </div>
          </div>
          {!approved ? (
            <>
              <label className="approval-note">
                Approval note
                <textarea
                  value={approvalNote}
                  onChange={(event) => setApprovalNote(event.target.value)}
                  placeholder="Add the reason for approving this change..."
                />
              </label>
              <div className="approval-actions">
                <button className="secondary-button" onClick={rejectPlan}>
                  <SafeIcon name="X" /> Reject plan
                </button>
                <button className="primary-button" onClick={approvePlan}>
                  <SafeIcon name="Check" /> Approve plan
                </button>
              </div>
            </>
          ) : (
            <p className="approval-audit">
              <SafeIcon name="UserCheck" />
              Approved by Jordan Miller{approvedAt ? ` · ${approvedAt}` : ''}
              {approvalNote.trim() ? ` · “${approvalNote.trim()}”` : ''}
            </p>
          )}
        </div>
      )}

      {completed && (
        <div className="failover-success">
          <SafeIcon name="CheckCircle" />
          <span>Traffic is now protected by the approved standby route.</span>
        </div>
      )}

      <div className="failover-actions">
        <button className="secondary-button" onClick={resetPlan} disabled={!planned && !completed}>
          <SafeIcon name="RotateCcw" /> Reset
        </button>
        <button className="secondary-button" onClick={planFailover} disabled={!canPlan || running || planned}>
          <SafeIcon name="GitBranch" /> Generate plan
        </button>
        <button className="primary-button" onClick={executeFailover} disabled={!approved || running || completed}>
          <SafeIcon name={running ? 'RefreshCw' : 'Zap'} />
          {running ? 'Executing...' : 'Execute failover'}
        </button>
      </div>
    </section>
  );
}

function GatewaySelect({ label, value, onChange, exclude, warning }) {
  return (
    <label className="failover-select">
      <span>{label}</span>
      <div className={warning ? 'source-select' : ''}>
        <SafeIcon name={warning ? 'AlertTriangle' : 'Shield'} />
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {gatewayOptions
            .filter((gateway) => gateway.name !== exclude)
            .map((gateway) => (
              <option value={gateway.name} key={gateway.name}>
                {gateway.name} · {gateway.region}
              </option>
            ))}
        </select>
      </div>
    </label>
  );
}

function ImpactStat({ label, value, warning }) {
  return (
    <span className={warning ? 'warning-stat' : ''}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

export default GatewayFailoverPlanner;