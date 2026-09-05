import React, { useMemo, useState } from 'react';
import SafeIcon from '../common/SafeIcon';
import '../gateway-health.css';

const gateways = [
  {
    name: 'Central Gateway',
    region: 'Central Hub',
    status: 'Healthy',
    uptime: '99.99%',
    latency: 3,
    load: 42,
    throughput: '2.86 Gbps',
    clients: 684,
    trend: -4
  },
  {
    name: 'North Gateway',
    region: 'North Campus',
    status: 'Healthy',
    uptime: '99.97%',
    latency: 8,
    load: 68,
    throughput: '1.94 Gbps',
    clients: 472,
    trend: 6
  },
  {
    name: 'East Gateway',
    region: 'East District',
    status: 'Attention',
    uptime: '99.82%',
    latency: 21,
    load: 89,
    throughput: '1.38 Gbps',
    clients: 318,
    trend: 14
  },
  {
    name: 'West Gateway',
    region: 'West Campus',
    status: 'Healthy',
    uptime: '99.95%',
    latency: 6,
    load: 54,
    throughput: '1.62 Gbps',
    clients: 368,
    trend: -2
  }
];

const sortOptions = [
  { value: 'health', label: 'Health score' },
  { value: 'load', label: 'Current load' },
  { value: 'latency', label: 'Latency' },
  { value: 'clients', label: 'Connected clients' }
];

function GatewayHealthComparison() {
  const [sortBy, setSortBy] = useState('health');
  const [selectedGateway, setSelectedGateway] = useState('East Gateway');

  const sortedGateways = useMemo(() => {
    const list = [...gateways];

    if (sortBy === 'health') {
      return list.sort((a, b) => a.latency - b.latency);
    }

    return list.sort((a, b) => b[sortBy] - a[sortBy]);
  }, [sortBy]);

  const healthyCount = gateways.filter((gateway) => gateway.status === 'Healthy').length;
  const averageLatency = Math.round(
    gateways.reduce((total, gateway) => total + gateway.latency, 0) / gateways.length
  );

  return (
    <section className="panel workspace-panel gateway-comparison">
      <div className="workspace-panel-title gateway-heading">
        <div>
          <p className="eyebrow">Regional edge telemetry</p>
          <h3>Gateway health comparison</h3>
        </div>
        <div className="gateway-heading-meta">
          <span><i className="gateway-live-dot" /> Live</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((option) => (
              <option value={option.value} key={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="gateway-summary">
        <span><small>Healthy gateways</small><strong>{healthyCount}/{gateways.length}</strong></span>
        <span><small>Average latency</small><strong>{averageLatency} ms</strong></span>
        <span><small>Network capacity</small><strong>74%</strong></span>
      </div>

      <div className="gateway-list">
        {sortedGateways.map((gateway) => {
          const selected = selectedGateway === gateway.name;
          const warning = gateway.status === 'Attention';

          return (
            <button
              className={`gateway-row ${selected ? 'selected' : ''} ${warning ? 'warning' : ''}`}
              key={gateway.name}
              onClick={() => setSelectedGateway(gateway.name)}
              aria-pressed={selected}
            >
              <span className="gateway-identity">
                <span className={`gateway-icon ${warning ? 'warning' : ''}`}>
                  <SafeIcon name="Radio" />
                </span>
                <span>
                  <strong>{gateway.name}</strong>
                  <small>{gateway.region}</small>
                </span>
              </span>

              <span className="gateway-health">
                <span className={`gateway-status ${warning ? 'warning' : ''}`}>
                  <i /> {gateway.status}
                </span>
                <small>{gateway.uptime} uptime</small>
              </span>

              <span className="gateway-load">
                <span><small>Load</small><b>{gateway.load}%</b></span>
                <i><em style={{ width: `${gateway.load}%` }} /></i>
              </span>

              <span className="gateway-metric">
                <small>Latency</small>
                <b className={gateway.latency > 15 ? 'warning-text' : ''}>{gateway.latency} ms</b>
              </span>

              <span className="gateway-metric clients-metric">
                <small>Clients</small>
                <b>{gateway.clients.toLocaleString()}</b>
              </span>

              <SafeIcon name={selected ? 'ChevronUp' : 'ChevronDown'} />
            </button>
          );
        })}
      </div>

      <div className="gateway-detail">
        {(() => {
          const gateway = gateways.find((item) => item.name === selectedGateway);
          const warning = gateway.status === 'Attention';

          return (
            <>
              <div className="gateway-detail-title">
                <span>
                  <SafeIcon name="Activity" />
                  {gateway.name} performance
                </span>
                <small>{gateway.throughput} throughput</small>
              </div>
              <div className="gateway-detail-bars">
                <DetailBar label="Load utilization" value={gateway.load} tone={warning ? 'orange' : 'lime'} />
                <DetailBar label="Latency efficiency" value={Math.max(0, 100 - gateway.latency * 2)} tone="blue" />
                <DetailBar label="Uptime target" value={Number.parseFloat(gateway.uptime)} tone="violet" />
              </div>
              <span className={`gateway-trend ${gateway.trend > 0 ? 'rising' : ''}`}>
                <SafeIcon name={gateway.trend > 0 ? 'TrendingUp' : 'TrendingDown'} />
                {gateway.trend > 0 ? '+' : ''}{gateway.trend}% load over selected period
              </span>
            </>
          );
        })()}
      </div>
    </section>
  );
}

function DetailBar({ label, value, tone }) {
  return (
    <span className="gateway-detail-bar">
      <span><small>{label}</small><b>{value}%</b></span>
      <i className={tone}><em style={{ width: `${Math.min(100, value)}%` }} /></i>
    </span>
  );
}

export default GatewayHealthComparison;