import React, { useMemo, useState } from 'react';
import SafeIcon from '../common/SafeIcon';

function DeploymentTracker({ deployments, onClear, onRetry }) {
  const [filter, setFilter] = useState('all');

  const visibleDeployments = useMemo(() => {
    if (filter === 'all') return deployments;
    return deployments.filter((deployment) => (
      deployment.status.toLowerCase() === filter
    ));
  }, [deployments, filter]);

  return (
    <section className="panel deployment-tracker">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Deployment telemetry</p>
          <h2>Handshake history</h2>
        </div>
        <div className="tracker-actions">
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All handshakes</option>
            <option value="verified">Verified</option>
            <option value="failed">Failed</option>
          </select>
          {deployments.length > 0 && (
            <button className="text-button" onClick={onClear}>
              Clear
            </button>
          )}
        </div>
      </div>

      {visibleDeployments.length > 0 ? (
        <div className="deployment-list">
          {visibleDeployments.map((deployment) => (
            <DeploymentRow
              deployment={deployment}
              key={deployment.id}
              onRetry={onRetry}
            />
          ))}
        </div>
      ) : (
        <div className="deployment-empty">
          <span><SafeIcon name="Activity" /></span>
          <strong>No handshake records yet</strong>
          <small>Completed deployments will appear here automatically.</small>
        </div>
      )}
    </section>
  );
}

function DeploymentRow({ deployment, onRetry }) {
  const formattedDate = new Date(deployment.completedAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  const failed = deployment.status === 'Failed';

  return (
    <article className={`deployment-row ${failed ? 'failed-row' : ''}`}>
      <div className={`deployment-status ${deployment.status.toLowerCase()}`}>
        <SafeIcon name={failed ? 'AlertTriangle' : 'Check'} />
      </div>

      <div className="deployment-copy">
        <strong>{deployment.nodeName}</strong>
        <span>{deployment.zone} · {formattedDate}</span>
      </div>

      <div className="deployment-metrics">
        <span>
          <small>Handshake</small>
          <b>{deployment.duration}s</b>
        </span>
        <span>
          <small>Stages</small>
          <b>{deployment.stages}/4</b>
        </span>
      </div>

      <span className={`deployment-badge ${deployment.status.toLowerCase()}`}>
        {deployment.status}
      </span>

      {failed && (
        <button
          className="deployment-retry"
          onClick={() => onRetry(deployment)}
          aria-label={`Retry handshake for ${deployment.nodeName}`}
        >
          <SafeIcon name="RefreshCw" />
          <span>Retry</span>
        </button>
      )}
    </article>
  );
}

export default DeploymentTracker;