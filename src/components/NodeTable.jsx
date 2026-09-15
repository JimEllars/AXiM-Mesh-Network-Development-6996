import React, { useMemo, useState } from 'react';
import { useMeshTelemetry } from '../services/telemetryService';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';


const { FiChevronRight, FiSliders, FiDownload } = FiIcons;

function NodeTable({ search, onSelectNode }) {
  const { nodes } = useMeshTelemetry();
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');

  const filteredNodes = useMemo(() => {
    let result = nodes.filter((node) => {
      const matchesSearch = `${node.id} ${node.region}`.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && (!warningsOnly || node.status === 'Warning');
    });

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'latency') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [nodes, search, warningsOnly, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortArrow = (field) => {
    if (sortField !== field) return null;
    return <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  const exportCSV = () => {
    const headers = ['Node ID', 'Region', 'Status', 'Load %', 'Latency', 'Clients', 'Frequency', 'Spreading Factor'];
    const rows = filteredNodes.map(node => [
      node.id,
      node.region,
      node.status,
      node.load,
      node.latency,
      node.clients,
      node.profile?.frequency || 'N/A',
      node.profile?.spreadingFactor || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `axim_node_telemetry_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="panel node-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">Infrastructure</p><h2>Priority nodes</h2></div>
        <div className="flex gap-2">
          <button className={`filter-button ${warningsOnly ? 'active' : ''}`} onClick={() => setWarningsOnly(!warningsOnly)}>
            <SafeIcon icon={FiSliders} /> {warningsOnly ? 'Warnings' : 'Filter'}
          </button>
          <button className="filter-button" onClick={exportCSV}>
            <SafeIcon icon={FiDownload} /> Export CSV
          </button>
        </div>
      </div>
      <div className="table-wrap overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} style={{cursor: 'pointer'}}>Node{renderSortArrow('id')}</th>
              <th onClick={() => handleSort('status')} style={{cursor: 'pointer'}}>Status{renderSortArrow('status')}</th>
              <th onClick={() => handleSort('load')} style={{cursor: 'pointer'}}>Load{renderSortArrow('load')}</th>
              <th onClick={() => handleSort('latency')} style={{cursor: 'pointer'}}>Latency{renderSortArrow('latency')}</th>
              <th onClick={() => handleSort('clients')} style={{cursor: 'pointer'}}>Clients{renderSortArrow('clients')}</th>
              <th />
            </tr>
          </thead>
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

import ComponentErrorBoundary from '../common/ComponentErrorBoundary';

const NodeTableWithErrorBoundary = (props) => (
  <ComponentErrorBoundary>
    <NodeTable {...props} />
  </ComponentErrorBoundary>
);

export default NodeTableWithErrorBoundary;