import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';

function SecurityEventModal({ event, onClose, onResolve, onReopen }) {
  const [note, setNote] = useState(event?.resolutionNote || '');

  if (!event) return null;

  const resolved = event.status === 'Resolved';

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Security event details">
      <motion.div
        className="modal-card security-event-modal"
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close event details">
          <SafeIcon name="X" />
        </button>

        <div className={`event-detail-icon ${event.type}`}>
          <SafeIcon name={event.type === 'warning' ? 'AlertTriangle' : 'Shield'} />
        </div>

        <div className="event-detail-heading">
          <div>
            <p className="eyebrow">Security event</p>
            <h2>{event.title}</h2>
          </div>
          <span className={`event-state ${resolved ? 'resolved' : 'open'}`}>
            {event.status}
          </span>
        </div>

        <p className="modal-intro">{event.description}</p>

        <div className="event-detail-grid">
          <Detail label="Source" value={event.source} />
          <Detail label="Detected" value={event.detectedAt} />
          <Detail label="Severity" value={event.severity} />
          <Detail label="Event ID" value={event.id} />
        </div>

        <label className="resolution-note">
          Resolution note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add context for the audit trail..."
            disabled={resolved}
          />
        </label>

        <div className={`resolution-message ${resolved ? 'complete' : ''}`}>
          <SafeIcon name={resolved ? 'CheckCircle' : 'Info'} />
          <span>
            {resolved
              ? `Resolved${event.resolvedAt ? ` on ${event.resolvedAt}` : ''}.`
              : 'Review the source and confirm the event has been handled before resolving it.'}
          </span>
        </div>

        <div className="event-modal-actions">
          <button className="secondary-button" onClick={onClose}>Close</button>
          {resolved ? (
            <button className="primary-button" onClick={onReopen}>
              <SafeIcon name="RefreshCw" />
              Reopen event
            </button>
          ) : (
            <button className="primary-button" onClick={() => onResolve(note.trim())}>
              <SafeIcon name="Check" />
              Mark as resolved
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="event-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default SecurityEventModal;