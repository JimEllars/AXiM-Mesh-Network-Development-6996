import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useTelemetryStatus, forceSyncTelemetry } from '../services/telemetryService';

const { FiBell, FiCommand, FiMenu, FiPlus, FiSearch, FiLogOut, FiUser, FiCpu } = FiIcons;

function Header({ onMenuOpen, onDeploy, onProvision, search, onSearch, onNotifications, user }) {
  const { isConnected, latencyMs, queuedCount, edgeColo, lastSyncTime } = useTelemetryStatus();
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');

  const handleLogout = () => {
    sessionStorage.removeItem('axim_user_session');
    window.location.href = 'https://passport.axim.us.com/logout?redirect=https://mesh.axim.us.com';
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    await forceSyncTelemetry();
    setIsSyncing(false);
    setToastMessage('Edge telemetry synchronized');
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <header className="topbar">
      <div className="title-group">
        <button className="menu-button" onClick={onMenuOpen} aria-label="Open menu">
          <SafeIcon icon={FiMenu} />
        </button>
        <div>
          <p>Network operations</p>
          <h1>Command center</h1>
        </div>
        <div
          className="telemetry-badge"
          onClick={handleForceSync}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', marginLeft: 'auto', marginRight: '16px', fontSize: '0.8rem', cursor: 'pointer', position: 'relative' }}
        >
          {isConnected ? (
            <>
              <span className={isSyncing ? '' : 'pulse-dot'} style={{ background: '#10b981', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #10b981', transition: 'all 0.3s', transform: isSyncing ? 'scale(1.5)' : 'scale(1)' }} />
              <span style={{ color: '#10b981', fontWeight: 600 }}>{edgeColo} • {latencyMs}ms</span>
            </>
          ) : (
            <>
              <span style={{ background: '#f59e0b', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', transition: 'all 0.3s', transform: isSyncing ? 'scale(1.5)' : 'scale(1)' }} />
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Degraded/Fallback • {queuedCount} queued</span>
            </>
          )}

          {showTooltip && (
             <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: '0', background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', padding: '12px', width: '220px', zIndex: 50, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Status</span>
                 <span style={{ color: isConnected ? '#10b981' : '#f59e0b', fontSize: '0.75rem', fontWeight: 'bold' }}>{isConnected ? 'Edge Active' : 'Fallback Active'}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Node</span>
                 <span style={{ color: '#e5e7eb', fontSize: '0.75rem' }}>{edgeColo}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Latency</span>
                 <span style={{ color: '#e5e7eb', fontSize: '0.75rem' }}>{latencyMs}ms</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Last Sync</span>
                 <span style={{ color: '#e5e7eb', fontSize: '0.75rem' }}>{new Date(lastSyncTime).toLocaleTimeString()}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Local Buffer</span>
                 <span style={{ color: '#e5e7eb', fontSize: '0.75rem' }}>{queuedCount} events</span>
               </div>
               <div style={{ marginTop: '12px', textAlign: 'center', borderTop: '1px solid #374151', paddingTop: '8px' }}>
                 <span style={{ color: '#60a5fa', fontSize: '0.7rem', cursor: 'pointer' }} onClick={handleForceSync}>
                   {isSyncing ? 'Syncing...' : 'Click to force sync'}
                 </span>
               </div>
             </div>
          )}

          {toastMessage && (
            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', background: '#374151', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', whiteSpace: 'nowrap', zIndex: 60, pointerEvents: 'none' }}>
              {toastMessage}
            </div>
          )}
        </div>
      </div>
      <div className="header-actions">
        <label className="search">
          <SafeIcon icon={FiSearch} />
          <input
            aria-label="Search network"
            placeholder="Search nodes..."
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
          <span><SafeIcon icon={FiCommand} /> K</span>
        </label>

        {user && (
          <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '20px' }}>
            <SafeIcon icon={FiUser} />
            <span style={{ fontSize: '0.85rem' }}>{user.name}</span>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#3b82f6', borderRadius: '4px', textTransform: 'uppercase' }}>{user.role}</span>
          </div>
        )}

        <button className="icon-button notification" aria-label="Notifications" onClick={onNotifications}>
          <SafeIcon icon={FiBell} />
          <i />
        </button>

        <button className="secondary-button" onClick={onProvision} style={{ marginRight: '8px' }}>
          <SafeIcon icon={FiCpu} />
          Provision Device
        </button>
        <button className="primary-button" onClick={onDeploy}>
          <SafeIcon icon={FiPlus} />
          Deploy node
        </button>

        {user && (
           <button className="icon-button" aria-label="Logout" onClick={handleLogout} title="Logout">
             <SafeIcon icon={FiLogOut} />
           </button>
        )}
      </div>
    </header>
  );
}

import ComponentErrorBoundary from '../common/ComponentErrorBoundary';

const HeaderWithErrorBoundary = (props) => (
  <ComponentErrorBoundary>
    <Header {...props} />
  </ComponentErrorBoundary>
);

export default HeaderWithErrorBoundary;
