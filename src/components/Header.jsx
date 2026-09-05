import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiBell, FiCommand, FiMenu, FiPlus, FiSearch } = FiIcons;

function Header({ onMenuOpen, onDeploy, search, onSearch, onNotifications }) {
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
        <button className="icon-button notification" aria-label="Notifications" onClick={onNotifications}>
          <SafeIcon icon={FiBell} />
          <i />
        </button>
        <button className="primary-button" onClick={onDeploy}>
          <SafeIcon icon={FiPlus} />
          Deploy node
        </button>
      </div>
    </header>
  );
}

export default Header;