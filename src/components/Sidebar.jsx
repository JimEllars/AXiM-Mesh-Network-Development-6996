import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { navigation } from '../data/networkData';

const { FiHexagon, FiSettings, FiHelpCircle, FiX } = FiIcons;

function Sidebar({ activePage, onNavigate, open, onClose }) {
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
            <div className="avatar">JM</div>
            <div>
              <strong>Jordan Miller</strong>
              <span>Network operator</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;