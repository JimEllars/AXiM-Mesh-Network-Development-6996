import React from 'react';
import { useMeshTelemetry } from '../services/telemetryService';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';


const { FiAlertTriangle, FiCheck, FiChevronRight, FiGitCommit, FiX, FiSearch } = FiIcons;

const activityIcons = {
  success: FiCheck,
  warning: FiAlertTriangle,
  info: FiGitCommit
};

function ActivityPanel() {
  const [filterCategory, setFilterCategory] = useState('all');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  const getCategory = (type) => {
    if (type === 'success') return 'Ops';
    if (type === 'warning') return 'Failover';
    if (type === 'info') return 'Security';
    return 'Ops';
  };

  const filteredActivity = activity.filter(item => {
    if (filterCategory !== 'all' && getCategory(item.type).toLowerCase() !== filterCategory.toLowerCase()) return false;
    return true;
  });

  const searchedHistory = activity.filter(item => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.meta.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== 'all' && getCategory(item.type).toLowerCase() !== filterCategory.toLowerCase()) return false;
    return true;
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && historyOpen) {
        setHistoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyOpen]);


  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">System log</p>
          <h2>Recent activity</h2>
        </div>
        <button className="text-button" onClick={() => setHistoryOpen(true)}>
          View all <SafeIcon icon={FiChevronRight} />
        </button>
      </div>


      <div style={{ display: 'flex', gap: '8px', padding: '0 12px 12px', overflowX: 'auto' }}>
        {['all', 'Ops', 'Failover', 'Security'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              background: filterCategory === cat ? 'rgba(184, 243, 74, 0.15)' : 'transparent',
              color: filterCategory === cat ? 'var(--lime)' : '#8994a5',
              border: `1px solid ${filterCategory === cat ? 'var(--lime)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '4px 10px',
              fontSize: '10px',
              textTransform: 'capitalize',
              cursor: 'pointer'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="activity-list">
        {filteredActivity.slice(0, 4).map((item) => (
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

      {historyOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" style={{ zIndex: 9999 }}>
          <motion.div
            className="modal-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
          >
            <button className="modal-close" onClick={() => setHistoryOpen(false)}>
              <SafeIcon icon={FiX} />
            </button>
            <h2 style={{ marginBottom: '16px' }}>Activity History</h2>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
               <label className="search" style={{ display: 'flex', alignItems: 'center', background: '#0b1018', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', flex: 1 }}>
                 <SafeIcon icon={FiSearch} style={{ color: '#8994a5', marginRight: '8px' }} />
                 <input
                   placeholder="Search events..."
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   style={{ background: 'transparent', border: 'none', color: '#dfe5ed', outline: 'none', width: '100%' }}
                 />
               </label>
               <select
                 value={filterCategory}
                 onChange={(e) => setFilterCategory(e.target.value)}
                 style={{ background: '#0b1018', border: '1px solid var(--border)', borderRadius: '8px', color: '#dfe5ed', padding: '6px 12px', outline: 'none' }}
               >
                 <option value="all">All Categories</option>
                 <option value="Ops">Operations</option>
                 <option value="Failover">Failover</option>
                 <option value="Security">Security</option>
               </select>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#586476', fontSize: '10px', borderBottom: '1px solid var(--border)' }}>Event</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#586476', fontSize: '10px', borderBottom: '1px solid var(--border)' }}>Category</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#586476', fontSize: '10px', borderBottom: '1px solid var(--border)' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedHistory.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`activity-icon ${item.type}`} style={{ width: '24px', height: '24px', margin: 0 }}>
                          <SafeIcon icon={activityIcons[item.type]} />
                        </span>
                        <div>
                          <strong style={{ color: '#cdd4de', fontSize: '12px', display: 'block' }}>{item.title}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#8994a5', fontSize: '11px' }}>
                        {getCategory(item.type)}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', color: '#5e697b', fontSize: '11px' }}>
                        {item.meta}
                      </td>
                    </tr>
                  ))}
                  {searchedHistory.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#5e697b' }}>No activities found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

    </section>
  );
}

export default ActivityPanel;