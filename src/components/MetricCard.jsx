import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiArrowUpRight } = FiIcons;

function MetricCard({ metric, index }) {
  return (
    <motion.article
      className="metric-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
    >
      <div className={`metric-icon ${metric.tone}`}>
        <SafeIcon name={metric.icon} />
      </div>
      <div className="metric-copy">
        <span>{metric.label}</span>
        <div className="metric-value">
          {metric.value}
          {metric.unit && <small>{metric.unit}</small>}
        </div>
        <p>{metric.detail}</p>
      </div>
      <div className={`metric-change ${metric.tone}`}>
        <SafeIcon icon={FiArrowUpRight} />
        {metric.change}
      </div>
    </motion.article>
  );
}

export default MetricCard;