import React from 'react';
import { useMeshTelemetry } from '../services/telemetryService';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';


const { FiAlertTriangle, FiCheck, FiChevronRight, FiGitCommit } = FiIcons;

const activityIcons = {
  success: FiCheck,
  warning: FiAlertTriangle,
  info: FiGitCommit
};

function ActivityPanel() {
  const { activity, securityEvents } = useMeshTelemetry();

  let score = 100;
  if (securityEvents) {
    securityEvents.forEach(event => {
      if (event.status === 'Open') {
        if (event.severity === 'High') {
          score -= 15;
        } else if (event.severity === 'Low' || event.severity === 'Medium') {
          score -= 5;
        }
      }
    });
  }
  score = Math.max(0, Math.min(100, score));

  const isWarning = score < 85;

  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">System log</p>
          <h2>Recent activity</h2>
        </div>
        <button className="text-button">
          View all <SafeIcon icon={FiChevronRight} />
        </button>
      </div>

      <div className="activity-list">
        {activity.map((item) => (
          <button className="activity-item" key={item.title}>
            <span className={`activity-icon ${item.type}`}>
              <SafeIcon icon={activityIcons[item.type]} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.meta}</small>
            </span>
            <SafeIcon icon={FiChevronRight} className="activity-arrow" />
          </button>
        ))}
      </div>

      <div className="security-card">
        <div className="security-score">
          <strong style={{ color: isWarning ? 'var(--orange)' : 'var(--lime)' }}>{score}</strong>
          <span>/ 100</span>
        </div>
        <div>
          <p>Security posture</p>
          <strong style={{ color: isWarning ? 'var(--orange)' : 'var(--lime)' }}>
            {isWarning ? 'Attention required' : 'All systems protected'}
          </strong>
        </div>
        <span className="pulse-dot" style={{ background: isWarning ? 'var(--orange)' : 'var(--lime)', boxShadow: isWarning ? '0 0 0 5px rgba(255, 172, 102, 0.08)' : '0 0 0 5px rgba(184, 243, 74, 0.08)' }} />
      </div>
    </section>
  );
}

export default ActivityPanel;