import React, { useMemo, useState } from 'react';

function NodeTrendChart({ values, labels, range }) {
  const [selectedPoint, setSelectedPoint] = useState(values.length - 1);

  const points = useMemo(() => (
    values.map((value, index) => ({
      value,
      x: 4 + (index * 92) / (values.length - 1),
      y: 90 - ((value - 20) / 70) * 70
    }))
  ), [values]);

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L 96 90 L 4 90 Z`;
  const gradientId = `load-area-${range.replace(/\s/g, '-')}`;

  return (
    <div className="trend-chart" onMouseLeave={() => setSelectedPoint(null)}>
      <div className="trend-y-axis" aria-hidden="true">
        <span>100%</span>
        <span>75%</span>
        <span>50%</span>
        <span>25%</span>
        <span>0%</span>
      </div>

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Node load over ${range}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b8f34a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#b8f34a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[20, 37.5, 55, 72.5, 90].map((y) => (
          <line
            className="trend-grid-line"
            key={y}
            x1="4"
            x2="96"
            y1={y}
            y2={y}
          />
        ))}

        <path className="trend-area" d={areaPath} fill={`url(#${gradientId})`} />
        <path className="trend-line" d={linePath} />

        {points.map((point, index) => (
          <g key={`${range}-${index}`}>
            <circle
              className={`trend-point ${selectedPoint === index ? 'selected' : ''}`}
              cx={point.x}
              cy={point.y}
              onFocus={() => setSelectedPoint(index)}
              onMouseEnter={() => setSelectedPoint(index)}
              onClick={() => setSelectedPoint(index)}
              r={selectedPoint === index ? 2.2 : 1.3}
              tabIndex="0"
              role="button"
              aria-label={`${labels[index]}: ${point.value}% load`}
            />
            <title>{`${labels[index]} · ${point.value}% load`}</title>
          </g>
        ))}
      </svg>

      {selectedPoint !== null && (
        <div
          className="trend-tooltip"
          style={{
            left: `${points[selectedPoint].x}%`,
            top: `${points[selectedPoint].y}%`
          }}
        >
          <strong>{values[selectedPoint]}% load</strong>
          <small>{labels[selectedPoint]}</small>
        </div>
      )}

      <div className="trend-x-axis">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export default NodeTrendChart;