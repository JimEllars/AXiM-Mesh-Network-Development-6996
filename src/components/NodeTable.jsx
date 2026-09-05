import React, { useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { nodes } from '../data/networkData';

const { FiChevronRight, FiSliders } = FiIcons;

function NodeTable({ search, onSelectNode }) {
  const [warningsOnly, setWarningsOnly] = useState(false);
  const filteredNodes = useMemo(() => nodes.filter((node) => {
    const matchesSearch = `${node.id} ${node.region}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (!warningsOnly || node.status === 'Warning');
  }), [search, warningsOnly]);

  return (
    <section className="panel node-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">Infrastructure</p><h2>Priority nodes</h2></div>
        <button className={`filter-button ${warningsOnly ? 'active' : ''}`} onClick={() => setWarningsOnly(!warningsOnly)}>
          <SafeIcon icon={FiSliders} /> {warningsOnly ? 'Warnings' : 'Filter'}
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Node</th><th>Status</th><th>Load</th><th>Latency</th><th>Clients</th><th /></tr></thead>
          <tbody>
            {filteredNodes.map((node) => (
              <tr key={node.id} onClick={() => onSelectNode(node)}>
                <td><strong>{node.id}</strong><span>{node.region}</span></td>
                <td><span className={`status ${node.status.toLowerCase()}`}><i /> {node.status}</span></td>
                <td><div className="load-cell"><div><span style={{ width: `${node.load}%` }} /></div><small>{node.load}%</small></div></td>
                <td className="mono">{node.latency}</td>
                <td className="mono">{node.clients}</td>
                <td><button className="row-action" aria-label={`View ${node.id}`}><SafeIcon icon={FiChevronRight} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredNodes.length && <p className="empty-state">No nodes match the current filters.</p>}
      </div>
    </section>
  );
}

export default NodeTable;