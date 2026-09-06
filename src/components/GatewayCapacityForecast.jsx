import React, { useEffect, useMemo, useState } from 'react';
import SafeIcon from '../common/SafeIcon';
import ComponentErrorBoundary from '../common/ComponentErrorBoundary';

const gateways = [
  { name: 'Central Gateway', region: 'Central Hub', load: 42, capacity: 82, clients: 684, color: 'lime' },
  { name: 'North Gateway', region: 'North Campus', load: 68, capacity: 76, clients: 472, color: 'blue' },
  { name: 'East Gateway', region: 'East District', load: 89, capacity: 94, clients: 318, color: 'orange' },
  { name: 'West Gateway', region: 'West Campus', load: 54, capacity: 79, clients: 368, color: 'violet' }
];

const horizons = {
  '6 hours': [1, 3, 5, 7, 9, 11],
  '24 hours': [2, 5, 8, 10, 13, 16],
  '7 days': [3, 7, 10, 14, 18, 21]
};

const scenarios = {
  baseline: { label: 'Baseline demand', multiplier: 1 },
  growth: { label: 'Demand growth', multiplier: 1.35 },
  incident: { label: 'Incident surge', multiplier: 1.8 }
};

function GatewayCapacityForecast({ onToast }) {
  const [gatewayName, setGatewayName] = useState('East Gateway');
  const [horizon, setHorizon] = useState('24 hours');
  const [scenario, setScenario] = useState('baseline');
  const [live, setLive] = useState(true);
  const [tick, setTick] = useState(0);
  const [recommendationApplied, setRecommendationApplied] = useState(false);

  const gateway = gateways.find((item) => item.name === gatewayName) || gateways[0];
  const scenarioConfig = scenarios[scenario];

  useEffect(() => {
    if (!live) return undefined;

    const timer = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [live]);

  const forecast = useMemo(() => {
    const liveAdjustment = tick % 3 === 0 ? 0 : tick % 3;
    return horizons[horizon].map((increase) => (
      Math.min(99, Math.round(
        gateway.load + (increase + liveAdjustment) * scenarioConfig.multiplier
      ))
    ));
  }, [gateway, horizon, scenarioConfig, tick]);

  const peak = Math.max(...forecast);
  const remaining = Math.max(0, gateway.capacity - peak);
  const overloaded = peak >= gateway.capacity;
  const needsScaling = peak >= gateway.capacity - 5;

  const applyRecommendation = () => {
    setRecommendationApplied(true);
    onToast?.(`${gateway.name} scaling recommendation queued`);
  };

  const resetRecommendation = () => {
    setRecommendationApplied(false);
  };

  return (
    <section className="panel workspace-panel capacity-forecast">
      <div className="workspace-panel-title forecast-heading">
        <div>
          <p className="eyebrow">Predictive capacity telemetry</p>
          <h3>Gateway capacity forecast</h3>
        </div>
        <button
          className={`forecast-live ${live ? 'active' : ''}`}
          onClick={() => setLive((current) => !current)}
          aria-pressed={live}
        >
          <i />
          {live ? 'Live model' : 'Paused'}
        </button>
      </div>

      <div className="forecast-controls">
        <label>
          <span>Gateway</span>
          <select value={gatewayName} onChange={(event) => {
            setGatewayName(event.target.value);
            resetRecommendation();
          }}>
            {gateways.map((item) => (
              <option value={item.name} key={item.name}>
                {item.name} · {item.region}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Forecast horizon</span>
          <select value={horizon} onChange={(event) => {
            setHorizon(event.target.value);
            resetRecommendation();
          }}>
            {Object.keys(horizons).map((item) => (
              <option value={item} key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Demand scenario</span>
          <select value={scenario} onChange={(event) => {
            setScenario(event.target.value);
            resetRecommendation();
          }}>
            {Object.entries(scenarios).map(([value, item]) => (
              <option value={value} key={value}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="forecast-summary">
        <ForecastStat label="Current load" value={`${gateway.load}%`} />
        <ForecastStat label="Projected peak" value={`${peak}%`} warning={overloaded} />
        <ForecastStat label="Safe headroom" value={`${remaining}%`} warning={remaining < 10} />
        <ForecastStat label="Connected clients" value={gateway.clients.toLocaleString()} />
      </div>

      <div className="forecast-chart overflow-x-auto">
        <div className="forecast-axis">
          <span>100%</span>
          <span>{gateway.capacity}% target</span>
          <span>0%</span>
        </div>
        <div className="forecast-bars">
          {forecast.map((value, index) => (
            <div className="forecast-bar-group" key={`${scenario}-${horizon}-${index}`}>
              <div className="forecast-bar-track">
                <i
                  className={value >= gateway.capacity ? 'risk' : gateway.color}
                  style={{ height: `${value}%` }}
                />
                <em style={{ bottom: `${gateway.capacity}%` }} />
              </div>
              <strong>{value}%</strong>
              <small>{getForecastLabel(horizon, index)}</small>
            </div>
          ))}
        </div>
      </div>

      <div className={`forecast-note ${overloaded ? 'risk' : ''}`}>
        <SafeIcon name={overloaded ? 'AlertTriangle' : 'TrendingUp'} />
        <span>
          {overloaded
            ? `${gateway.name} is forecast to exceed its ${gateway.capacity}% operating target.`
            : `${gateway.name} retains ${remaining}% headroom at the projected peak.`}
        </span>
      </div>

      <div className="forecast-recommendation">
        <div>
          <span className="recommendation-label">
            <SafeIcon name="Sliders" />
            Capacity recommendation
          </span>
          <strong>
            {needsScaling
              ? `Shift approximately ${Math.max(8, Math.round(gateway.clients * 0.12))} clients to a standby gateway`
              : 'No scaling action required'}
          </strong>
        </div>
        {needsScaling && (
          <button
            className={recommendationApplied ? 'recommendation-applied' : 'recommendation-button'}
            onClick={applyRecommendation}
            disabled={recommendationApplied}
          >
            <SafeIcon name={recommendationApplied ? 'Check' : 'Zap'} />
            {recommendationApplied ? 'Queued' : 'Queue action'}
          </button>
        )}
      </div>
    </section>
  );
}

function getForecastLabel(horizon, index) {
  if (horizon === '7 days') return `D${index + 1}`;
  return `+${index + 1}${horizon === '6 hours' ? 'h' : 'h'}`;
}

function ForecastStat({ label, value, warning }) {
  return (
    <span className={warning ? 'forecast-stat-warning' : ''}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}


const GatewayCapacityForecastWithErrorBoundary = (props) => (
  <ComponentErrorBoundary>
    <GatewayCapacityForecast {...props} />
  </ComponentErrorBoundary>
);

export default GatewayCapacityForecastWithErrorBoundary;
