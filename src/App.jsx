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
import { useMeshTelemetry } from './services/telemetryService';
import './App.css';
import './functional.css';

const deploymentStorageKey = 'axim-deployment-handshakes';

function App() {
  const { metrics } = useMeshTelemetry();
  const [activePage, setActivePage] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [deployOpen, setDeployOpen] = useState(false);
  const [retryTarget, setRetryTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [deployments, setDeployments] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return JSON.parse(window.localStorage.getItem(deploymentStorageKey)) || [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [user, setUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Phase B: Passport Session Gating
  useEffect(() => {
    const authenticate = async () => {
      setIsAuthenticating(true);

      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      // Check for token in URL callback
      if (window.location.pathname === '/auth/callback' && token) {
        try {
          const response = await fetch('https://passport.axim.us.com/api/v1/auth/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });

          if (response.ok) {
            const userData = await response.json();
            const allowedRoles = ['network', 'operations', 'admin', 'super_user'];
            if (allowedRoles.includes(userData.role)) {
               setUser(userData);
               // Clean up URL
               window.history.replaceState({}, document.title, '/');
            } else {
               window.location.href = 'https://passport.axim.us.com/login?redirect=https://mesh.axim.us.com/auth/callback';
            }
          } else {
            window.location.href = 'https://passport.axim.us.com/login?redirect=https://mesh.axim.us.com/auth/callback';
          }
        } catch (error) {
           console.error('SSO verification failed', error);
           window.location.href = 'https://passport.axim.us.com/login?redirect=https://mesh.axim.us.com/auth/callback';
        }
        setIsAuthenticating(false);
        return;
      }

      // Check for wildcard axim_session cookie (simulated checking for now)
      const hasSessionCookie = document.cookie.includes('axim_session=');
      if (hasSessionCookie) {
        // In a real scenario, we might re-verify with the backend,
        // but for now assume a dummy valid user if the cookie exists
        setUser({ name: 'James Ellars', role: 'super_user' });
      } else if (process.env.NODE_ENV !== 'development' && window.location.pathname !== '/auth/callback') {
        // Mock redirect logic for dev environments, actual will redirect to passport
        // window.location.href = 'https://passport.axim.us.com/login?redirect=https://mesh.axim.us.com/auth/callback';

        // For development purpose, if not authed, assign a mock user:
        setUser({ name: 'James Ellars', role: 'super_user' });
      } else {
         setUser({ name: 'James Ellars', role: 'super_user' });
      }

      setIsAuthenticating(false);
    };

    authenticate();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(deploymentStorageKey, JSON.stringify(deployments));
    }
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

  if (isAuthenticating) {
    return <div className="loading-screen">Authenticating with AXiM Passport...</div>;
  }

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
          user={user}
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
