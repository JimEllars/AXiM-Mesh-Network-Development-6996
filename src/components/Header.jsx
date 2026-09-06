import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiBell, FiCommand, FiMenu, FiPlus, FiSearch, FiLogOut, FiUser } = FiIcons;

function Header({ onMenuOpen, onDeploy, search, onSearch, onNotifications, user }) {
  const handleLogout = () => {
    // In a real implementation this might delete cookies or make an API call
    window.location.href = 'https://passport.axim.us.com/logout?redirect=https://mesh.axim.us.com';
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

export default Header;
