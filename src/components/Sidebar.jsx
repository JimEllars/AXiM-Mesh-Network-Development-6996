import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { navigation } from '../data/networkData';

const { FiHexagon, FiSettings, FiHelpCircle, FiX } = FiIcons;

function Sidebar({ activePage, onNavigate, open, onClose, user }) {
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