import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MetricCard from './components/MetricCard';
import NetworkTopology from './components/NetworkTopology';
import ActivityPanel from './components/ActivityPanel';
import NodeTable from './components/NodeTable';
import DeployModal from './components/DeployModal';
import NodeDetailModal from './components/NodeDetailModal';
import DeploymentTracker from './components/DeploymentTracker';
import WorkspacePage from './components/WorkspacePage';
import { metrics } from './data/networkData';
import './App.css';
import './functional.css';
import './handshake.css';

const deploymentStorageKey = 'axim-deployment-handshakes';

function App() {
  const [activePage, setActivePage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [deployOpen, setDeployOpen] = useState(false);
  const [retryTarget, setRetryTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [deployments, setDeployments] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(deploymentStorageKey)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(deploymentStorageKey, JSON.stringify(deployments));
  }, [deployments]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const navigate = (page) => {
    setActivePage(page);
    setSearch('');
  };

  const openDeployment = (target = null) => {
    setRetryTarget(target);
    setDeployOpen(true);
  };

  const closeDeployment = () => {
    setDeployOpen(false);
    setRetryTarget(null);
  };

  const handleDeploymentComplete = (deployment) => {
    setDeployments((current) => {
      const previous = current.find((item) => (
        item.nodeName === deployment.nodeName &&
        item.zone === deployment.zone &&
        item.status === 'Failed'
      ));

      const next = previous
        ? current.map((item) => (
            item.id === previous.id
              ? { ...deployment, retryOf: previous.id }
              : item
          ))
        : [deployment, ...current];

      return next.slice(0, 20);
    });

    showToast(`${deployment.nodeName} completed its secure mesh handshake`);
  };

  const handleDeploymentFailure = (deployment) => {
    setDeployments((current) => [deployment, ...current].slice(0, 20));
    showToast(`${deployment.nodeName} handshake failed — retry available`);
  };

  const clearDeployments = () => {
    setDeployments([]);
    showToast('Handshake history cleared from this browser');
  };

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <Header
          onMenuOpen={() => setSidebarOpen(true)}
          onDeploy={() => openDeployment()}
          search={search}
          onSearch={setSearch}
          onNotifications={() => showToast('3 security events need your attention')}
        />

        <div className="page-content">
          {activePage === 'overview' ? (
            <>
              <motion.div
                className="network-status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span><i /> Network operational</span>
                <p>Last synchronized just now</p>
              </motion.div>

              <section className="metrics-grid">
                {metrics.map((metric, index) => (
                  <MetricCard key={metric.label} metric={metric} index={index} />
                ))}
              </section>

              <div className="dashboard-grid">
                <NetworkTopology
                  selected={selectedNode?.id || 'core'}
                  onSelect={(id) => showToast(`${id} topology node selected`)}
                  onRefresh={() => showToast('Topology synchronized')}
                  onFullscreen={() => showToast('Fullscreen topology view is ready')}
                />
                <ActivityPanel />
              </div>

              <NodeTable search={search} onSelectNode={setSelectedNode} />

              <DeploymentTracker
                deployments={deployments}
                onClear={clearDeployments}
                onRetry={openDeployment}
              />

              <p className="footer-note">
                AXiM OS 4.8.2 · Encrypted end-to-end · All systems nominal
              </p>
            </>
          ) : (
            <WorkspacePage page={activePage} onToast={showToast} />
          )}
        </div>
      </main>

      {deployOpen && (
        <DeployModal
          initialNodeName={retryTarget?.nodeName}
          initialZone={retryTarget?.zone}
          onClose={closeDeployment}
          onComplete={handleDeploymentComplete}
          onFailure={handleDeploymentFailure}
        />
      )}

      {selectedNode && (
        <NodeDetailModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {toast && <div className="toast"><span /><strong>{toast}</strong></div>}
    </div>
  );
}

export default App;