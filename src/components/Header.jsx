import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useTelemetryStatus, forceSyncTelemetry } from '../services/telemetryService';

const { FiBell, FiCommand, FiMenu, FiPlus, FiSearch, FiLogOut, FiUser } = FiIcons;

function Header({ onMenuOpen, onDeploy, search, onSearch, onNotifications, user }) {
  const { isConnected, latencyMs, queuedCount } = useTelemetryStatus();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');

  const handleLogout = () => {
    // In a real implementation this might delete cookies or make an API call
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
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', marginLeft: '16px', fontSize: '0.8rem', cursor: 'pointer', position: 'relative' }}
          title="Force sync telemetry"
        >
          {isConnected ? (
            <>
              <span className={isSyncing ? '' : 'pulse-dot'} style={{ background: '#10b981', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #10b981', transition: 'all 0.3s', transform: isSyncing ? 'scale(1.5)' : 'scale(1)' }} />
              <span style={{ color: '#10b981' }}>Live Edge • {latencyMs}ms</span>
            </>
          ) : (
            <>
              <span style={{ background: '#f59e0b', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', transition: 'all 0.3s', transform: isSyncing ? 'scale(1.5)' : 'scale(1)' }} />
              <span style={{ color: '#f59e0b' }}>Buffered Mode • {queuedCount} events queued</span>
            </>
          )}
          {toastMessage && (
            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', background: '#374151', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
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
