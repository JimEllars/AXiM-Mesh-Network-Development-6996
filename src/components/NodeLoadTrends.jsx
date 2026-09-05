import React, { useEffect, useMemo, useState } from 'react';
import SafeIcon from '../common/SafeIcon';
import NodeTrendChart from './NodeTrendChart';
import { nodes } from '../data/networkData';
import '../node-trends.css';

const ranges = {
  '12 hours': {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', 'Now'],
    steps: [0, 4, 8, 12, 16, 20]
  },
  '24 hours': {
    labels: ['00:00', '06:00', '12:00', '18:00', 'Now'],
    steps: [0, 6, 12, 18, 24]
  },
  '7 days': {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Now'],
    steps: [0, 1, 2, 3, 4, 5, 6]
  }
};

function buildTrend(node, range, tick) {
  const { steps } = ranges[range];
  const seed = node.id.length + node.load;
  const drift = range === '7 days' ? 3 : range === '24 hours' ? 2 : 1;

  return steps.map((step, index) => {
    const wave = Math.sin((seed + step + tick) * 0.8) * 6;
    const direction = index * drift;
    return Math.max(8, Math.min(98, Math.round(node.load - 18 + direction + wave)));
  });
}

function NodeLoadTrends() {
  const [range, setRange] = useState('12 hours');
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0].id);
  const [live, setLive] = useState(true);
  const [tick, setTick] = useState(0);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || nodes[0];
  const values = useMemo(
    () => buildTrend(selectedNode, range, tick),
    [selectedNode, range, tick]
  );
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const peak = Math.max(...values);
  const change = values[values.length - 1] - values[0];

  useEffect(() => {
    if (!live) return undefined;

    const timer = window.setInterval(() => setTick((current) => current + 1), 5000);
    return () => window.clearInterval(timer);
  }, [live]);

  const refresh = () => setTick((current) => current + 1);

  return (
    <section className="panel workspace-panel load-trends">
      <div className="workspace-panel-title trends-heading">
        <div>
          <p className="eyebrow">Capacity telemetry · simulated live data</p>
          <h3>Node load trends</h3>
        </div>

        <div className="trend-controls">
          <button
            className={`trend-live ${live ? 'active' : ''}`}
            onClick={() => setLive((current) => !current)}
            aria-pressed={live}
          >
            <i />
            {live ? 'Live' : 'Paused'}
          </button>
          <button className="trend-refresh" onClick={refresh} aria-label="Refresh node load">
            <SafeIcon name="RefreshCw" />
          </button>
        </div>
      </div>

      <div className="trend-node-select">
        <SafeIcon name="Radio" />
        <select
          value={selectedNode.id}
          onChange={(event) => setSelectedNodeId(event.target.value)}
          aria-label="Select node for load trend"
        >
          {nodes.map((node) => (
            <option value={node.id} key={node.id}>
              {node.id} · {node.region}
            </option>
          ))}
        </select>
        <span className={`trend-node-status ${selectedNode.status.toLowerCase()}`}>
          <i />
          {selectedNode.status}
        </span>
      </div>

      <div className="trend-summary">
        <span>
          <small>Average load</small>
          <strong>{average}%</strong>
        </span>
        <span>
          <small>Peak load</small>
          <strong>{peak}%</strong>
        </span>
        <span className={`trend-positive ${change < 0 ? 'cooling' : ''}`}>
          <SafeIcon name={change < 0 ? 'TrendingDown' : 'TrendingUp'} />
          {change > 0 ? '+' : ''}{change}% trend
        </span>
      </div>

      <div className="trend-range" role="group" aria-label="Trend time range">
        {Object.keys(ranges).map((option) => (
          <button
            className={range === option ? 'active' : ''}
            key={option}
            onClick={() => setRange(option)}
            aria-pressed={range === option}
          >
            {option}
          </button>
        ))}
      </div>

      <NodeTrendChart
        values={values}
        labels={ranges[range].labels}
        range={range}
      />
    </section>
  );
}

export default NodeLoadTrends;