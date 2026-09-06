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
  const { activity } = useMeshTelemetry();
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
          <strong>98</strong>
          <span>/ 100</span>
        </div>
        <div>
          <p>Security posture</p>
          <strong>All systems protected</strong>
        </div>
        <span className="pulse-dot" />
      </div>
    </section>
  );
}

export default ActivityPanel;