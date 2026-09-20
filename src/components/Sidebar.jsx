import React, { useState, useEffect } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { navigation } from '../data/networkData';

const { FiHexagon, FiSettings, FiHelpCircle, FiX } = FiIcons;

function Sidebar({ activePage, onNavigate, open, onClose, user, onOpenPassModal }) {

  const [pass, setPass] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const checkPass = () => {
      const passDataStr = localStorage.getItem('axim_mesh_pass');
      if (passDataStr) {
        try {
          const passData = JSON.parse(passDataStr);
          const expiresAt = new Date(passData.expiresAt).getTime();
          const now = Date.now();
          if (expiresAt > now) {
            setPass(passData);

            const diffMs = expiresAt - now;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`Expires in ${diffHours}h ${diffMins}m`);
          } else {
            setPass(null);
            setTimeLeft('');
          }
        } catch (e) {
          setPass(null);
          setTimeLeft('');
        }
      } else {
        setPass(null);
        setTimeLeft('');
      }
    };

    checkPass();
    const intervalId = setInterval(checkPass, 60000); // Check every minute

    // Also listen for storage events to update immediately when a pass is purchased in another tab or in the modal
    const handleStorage = (e) => {
      if (e.key === 'axim_mesh_pass') {
        checkPass();
      }
    };

    // Custom event to trigger re-check when we update localStorage in the same window
    const handleLocalPassUpdate = () => checkPass();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('axim_mesh_pass_updated', handleLocalPassUpdate);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('axim_mesh_pass_updated', handleLocalPassUpdate);
    };
  }, []);

  return (
    <>
      <button
        className={`sidebar-scrim ${open ? 'visible' : ''}`}
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <SafeIcon icon={FiHexagon} />
          </div>
          <div>
            <strong>AXiM</strong>
            <span>MESH NETWORK</span>
          </div>
          <button className="mobile-close" onClick={onClose} aria-label="Close menu">
            <SafeIcon icon={FiX} />
          </button>
        </div>

        <p className="nav-heading">Command center</p>
        <nav className="main-nav">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? 'active' : ''}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
            >
              <SafeIcon name={item.icon} />
              <span>{item.label}</span>
              {item.id === 'security' && <i>3</i>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button>
            <SafeIcon icon={FiHelpCircle} />
            <span>Support</span>
          </button>
          <button>
            <SafeIcon icon={FiSettings} />
            <span>Settings</span>
          </button>

          <div className="pass-card" style={{ padding: '12px', margin: '0 12px 16px 12px', background: '#1a2230', borderRadius: '8px', border: '1px solid #2a3441' }}>
            {pass ? (
              <>
                <p style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 'bold' }}>Active Access Pass</p>
                <div style={{ fontSize: '13px', color: '#e5e7eb', marginBottom: '2px' }}>{pass.tier.toUpperCase()} ({pass.token.slice(0, 11)}...)</div>
                <div style={{ fontSize: '11px', color: '#10b981', marginBottom: '10px' }}>{timeLeft}</div>
                <button onClick={onOpenPassModal} style={{ width: '100%', padding: '6px', fontSize: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>[ Manage Pass ]</button>
              </>
            ) : user?.role !== 'admin' && user?.role !== 'super_user' ? (
              <>
                <p style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 'bold' }}>NO ACTIVE PASS</p>
                <button onClick={onOpenPassModal} style={{ width: '100%', padding: '6px', fontSize: '12px', background: '#ea580c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '4px' }}>[ Get Pass ]</button>
              </>
            ) : null}
          </div>
          <div className="operator-card">

            <div className="avatar">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'JM'}
            </div>
            <div>
              <strong>{user?.name || 'Jordan Miller'}</strong>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.2)', color: '#62a8ff', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', marginTop: '4px' }}>
                {user?.role ? user.role.replace('_', ' ') : 'Network operator'}
              </span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;