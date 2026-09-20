import React, { useEffect, useMemo, useState } from 'react';
import SafeIcon from '../common/SafeIcon';
import SecurityEventModal from './SecurityEventModal';
import SecurityEventQueue from './SecurityEventQueue';
import NodeLoadTrends from './NodeLoadTrends';
import GatewayHealthComparison from './GatewayHealthComparison';
import GatewayFailoverPlanner from './GatewayFailoverPlanner';
import GatewayCapacityForecast from './GatewayCapacityForecast';
import { useMeshTelemetry, useMeshMessages } from '../services/telemetryService';



const pageContent = {
  topology: {
    eyebrow: 'Live infrastructure',
    title: 'Topology explorer',
    description: 'Inspect mesh relationships, encrypted routes, and regional health.',
    icon: 'Share2'
  },
  nodes: {
    eyebrow: 'Infrastructure inventory',
    title: 'Node management',
    description: 'Review every enrolled node and identify capacity risks before they impact service.',
    icon: 'Server'
  },
  traffic: {
    eyebrow: 'Network telemetry',
    title: 'Traffic intelligence',
    description: 'Track throughput, client demand, and route efficiency across the mesh.',
    icon: 'Activity'
  },
  security: {
    eyebrow: 'Protection center',
    title: 'Security posture',
    description: 'Monitor encryption, access events, and the items requiring operator review.',
    icon: 'Shield'
  }
};

const trafficBars = [42, 58, 48, 70, 63, 77, 68, 88, 72, 94, 81, 86];

function WorkspacePage({ page, onToast }) {
  const { nodes, securityEvents, updateSecurityEvents } = useMeshTelemetry();
  const { messages, sendMeshMessage } = useMeshMessages();
  const [chatInput, setChatInput] = useState('');

  const content = pageContent[page];
  const [selectedEvent, setSelectedEvent] = useState(null);
  const openEvents = useMemo(
    () => securityEvents.filter((event) => event.status === 'Open'),
    [securityEvents]
  );

  const resolveEvent = (note = '') => {
    updateSecurityEvents((current) => current.map((event) => (
      event.id === selectedEvent.id
        ? {
            ...event,
            status: 'Resolved',
            resolutionNote: note,
            resolvedAt: new Date().toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
          }
        : event
    )));
    onToast(`${selectedEvent.title} resolved`);
    setSelectedEvent(null);
  };

  const reopenEvent = () => {
    updateSecurityEvents((current) => current.map((event) => (
      event.id === selectedEvent.id
        ? { ...event, status: 'Open', resolvedAt: '', resolutionNote: '' }
        : event
    )));
    onToast(`${selectedEvent.title} reopened`);
    setSelectedEvent(null);
  };

  const resolveAll = () => {
    const resolvedAt = new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    updateSecurityEvents((current) => current.map((event) => (
      event.status === 'Open'
        ? {
            ...event,
            status: 'Resolved',
            resolvedAt,
            resolutionNote: 'Resolved during queue review.'
          }
        : event
    )));
    onToast(`${openEvents.length} security event${openEvents.length === 1 ? '' : 's'} resolved`);
  };

  return (
    <section className="workspace-page">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">{content.eyebrow}</p>
          <h2>{content.title}</h2>
          <p>{content.description}</p>
        </div>
        <div className="workspace-icon"><SafeIcon name={content.icon} /></div>
      </div>

      {page === 'nodes' && (
        <>
          <div className="workspace-grid node-summary">
            <SummaryCard label="Enrolled nodes" value="252" detail="248 currently online" tone="lime" />
            <SummaryCard label="Average load" value="58%" detail="12% below threshold" tone="blue" />
            <SummaryCard label="Needs attention" value="04" detail="2 warnings · 2 offline" tone="orange" />
          </div>
          <NodeLoadTrends />
          <section className="panel workspace-panel compact-node-list">
            <PanelTitle title="Node health snapshot" eyebrow="Current distribution" />
            {nodes.slice(0, 4).map((node) => (
              <div className="snapshot-row" key={node.id}>
                <span><strong>{node.id}</strong><small>{node.region}</small></span>
                <div className="snapshot-load"><i style={{ width: `${node.load}%` }} /></div>
                <b>{node.load}%</b>
              </div>
            ))}
          </section>
        </>
      )}

      {page === 'traffic' && (() => {
        const totalClients = nodes.reduce((sum, n) => sum + (n.clients || 0), 0);
        // Base throughput calculation derived dynamically
        const baseGbps = 8.42;
        const dynamicGbps = totalClients > 0 ? (baseGbps * (totalClients / 1500)).toFixed(2) : baseGbps;

        // Dynamically adjust bandwidth split slightly based on online nodes count
        const activeNodes = nodes.filter(n => n.status === 'Online').length;
        const meshDataPct = Math.min(80, Math.max(50, 64 + Math.floor((activeNodes - 200) / 10)));
        const controlPlanePct = Math.min(20, Math.max(5, 9 + Math.floor((250 - activeNodes) / 20)));
        const clientTrafficPct = 100 - meshDataPct - controlPlanePct;

        return (
        <>
        <div className="workspace-grid traffic-layout">
          <section className="panel workspace-panel">
            <PanelTitle title="Throughput over the last 12 hours" eyebrow="Live telemetry" />
            <div className="traffic-chart">
              {trafficBars.map((height, index) => (
                <div className="traffic-bar-wrap" key={index}>
                  <span style={{ height: `${height}%` }} />
                  <small>{index + 1}h</small>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center' }}>
               Total Connected Clients: {totalClients.toLocaleString()}
            </div>
          </section>
          <section className="panel workspace-panel">
            <PanelTitle title="Traffic split" eyebrow="By protocol" />
            <div className="traffic-split">
              <div className="donut-chart"><strong>{dynamicGbps}</strong><small>Gbps</small></div>
              <div className="split-list">
                <span><i className="lime-dot" /> Mesh data <b>{meshDataPct}%</b></span>
                <span><i className="blue-dot" /> Client traffic <b>{clientTrafficPct}%</b></span>
                <span><i className="violet-dot" /> Control plane <b>{controlPlanePct}%</b></span>
              </div>
            </div>
          </section>
        </div>

        <section className="panel workspace-panel" style={{ marginTop: '24px' }}>
          <PanelTitle title="Live RF Chat Stream (#public)" eyebrow="Off-Grid Mesh Console" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', padding: '12px', background: '#0f141d', borderRadius: '8px', border: '1px solid #1f2937' }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#1a2230', padding: '10px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '12px' }}>{msg.callsign}</span>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#9ca3af' }}>
                    <span style={{ background: '#374151', padding: '2px 6px', borderRadius: '4px' }}>RSSI: {msg.rssi}dBm</span>
                    <span style={{ background: '#374151', padding: '2px 6px', borderRadius: '4px' }}>SNR: {msg.snr}dB</span>
                    <span style={{ background: '#374151', padding: '2px 6px', borderRadius: '4px' }}>Hops: {msg.hops}</span>
                  </div>
                </div>
                <div style={{ color: '#e5e7eb', fontSize: '14px' }}>{msg.payload}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Transmit message via mesh..."
              style={{ flex: 1, background: '#111721', border: '1px solid #374151', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '14px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  let passData = null;
                  try {
                    passData = JSON.parse(localStorage.getItem('axim_mesh_pass'));
                  } catch(err) { /* ignore */ }

                  sendMeshMessage('#public', chatInput.trim(), passData?.token);
                  setChatInput('');
                }
              }}
            />
            <button
              onClick={() => {
                if (chatInput.trim()) {
                  let passData = null;
                  try {
                    passData = JSON.parse(localStorage.getItem('axim_mesh_pass'));
                  } catch(err) { /* ignore */ }
                  sendMeshMessage('#public', chatInput.trim(), passData?.token);
                  setChatInput('');
                }
              }}
              style={{ background: '#2563eb', color: 'white', padding: '0 24px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              TX
            </button>
          </div>
        </section>
        </>
      )})()}

      {page === 'security' && (
        <div className="workspace-grid security-layout">
          <SummaryCard
            label="Open events"
            value={openEvents.length.toString().padStart(2, '0')}
            detail="Require operator review"
            tone="orange"
          />
          <SummaryCard
            label="Resolved today"
            value={securityEvents.filter((event) => event.status === 'Resolved').length.toString().padStart(2, '0')}
            detail="Audit trail maintained"
            tone="lime"
          />
          <SummaryCard label="Encrypted links" value="100%" detail="No unencrypted routes" tone="blue" />
          <SecurityEventQueue events={securityEvents} onSelect={setSelectedEvent} onResolveAll={resolveAll} />
        </div>
      )}

      {page === 'topology' && (
        <>
          <div className="workspace-grid topology-summary">
            <SummaryCard label="Connected regions" value="14" detail="All regional gateways online" tone="blue" />
            <SummaryCard label="Encrypted links" value="618" detail="6 routes optimized today" tone="lime" />
            <SummaryCard label="Route efficiency" value="94.6%" detail="+3.2% this week" tone="violet" />
          </div>
          <GatewayHealthComparison />
          <GatewayCapacityForecast onToast={onToast} />
          <GatewayFailoverPlanner onToast={onToast} />
        </>
      )}

      {selectedEvent && (
        <SecurityEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onResolve={resolveEvent}
          onReopen={reopenEvent}
        />
      )}
    </section>
  );
}

function SummaryCard({ label, value, detail, tone }) {
  return (
    <article className={`workspace-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function PanelTitle({ title, eyebrow }) {
  return (
    <div className="workspace-panel-title">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
    </div>
  );
}

export default WorkspacePage;