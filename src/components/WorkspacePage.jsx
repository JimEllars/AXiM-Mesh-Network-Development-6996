import React, { useEffect, useMemo, useState } from 'react';
import SafeIcon from '../common/SafeIcon';
import SecurityEventModal from './SecurityEventModal';
import SecurityEventQueue from './SecurityEventQueue';
import NodeLoadTrends from './NodeLoadTrends';
import GatewayHealthComparison from './GatewayHealthComparison';
import GatewayFailoverPlanner from './GatewayFailoverPlanner';
import GatewayCapacityForecast from './GatewayCapacityForecast';
import { useMeshTelemetry } from '../services/telemetryService';



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

      {page === 'traffic' && (
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
          </section>
          <section className="panel workspace-panel">
            <PanelTitle title="Traffic split" eyebrow="By protocol" />
            <div className="traffic-split">
              <div className="donut-chart"><strong>8.42</strong><small>Gbps</small></div>
              <div className="split-list">
                <span><i className="lime-dot" /> Mesh data <b>64%</b></span>
                <span><i className="blue-dot" /> Client traffic <b>27%</b></span>
                <span><i className="violet-dot" /> Control plane <b>9%</b></span>
              </div>
            </div>
          </section>
        </div>
      )}

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