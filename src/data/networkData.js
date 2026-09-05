export const navigation = [
  { id: 'overview', label: 'Overview', icon: 'Grid' },
  { id: 'topology', label: 'Topology', icon: 'Share2' },
  { id: 'nodes', label: 'Nodes', icon: 'Server' },
  { id: 'traffic', label: 'Traffic', icon: 'Activity' },
  { id: 'security', label: 'Security', icon: 'Shield' }
];

export const metrics = [
  {
    label: 'Active nodes',
    value: '248',
    detail: 'of 252 total',
    change: '+4 this week',
    icon: 'Radio',
    tone: 'lime'
  },
  {
    label: 'Mesh health',
    value: '99.98%',
    detail: '30-day uptime',
    change: 'Optimal',
    icon: 'Heart',
    tone: 'blue'
  },
  {
    label: 'Throughput',
    value: '8.42',
    unit: 'Gbps',
    detail: '12.8 Gbps capacity',
    change: '+12.4%',
    icon: 'Zap',
    tone: 'violet'
  },
  {
    label: 'Active clients',
    value: '1,842',
    detail: 'across 14 zones',
    change: '+84 today',
    icon: 'Users',
    tone: 'orange'
  }
];

export const nodes = [
  { id: 'AX-CORE-01', region: 'Central Hub', status: 'Online', load: 42, latency: '3 ms', clients: 184 },
  { id: 'AX-NORTH-04', region: 'North Campus', status: 'Online', load: 68, latency: '8 ms', clients: 127 },
  { id: 'AX-EAST-12', region: 'East District', status: 'Warning', load: 89, latency: '21 ms', clients: 96 },
  { id: 'AX-WEST-07', region: 'West Campus', status: 'Online', load: 54, latency: '6 ms', clients: 153 },
  { id: 'AX-SOUTH-09', region: 'South District', status: 'Online', load: 37, latency: '9 ms', clients: 112 }
];

export const activity = [
  { title: 'Route automatically optimized', meta: 'AX-NORTH-04 · 2 min ago', type: 'success' },
  { title: 'High utilization detected', meta: 'AX-EAST-12 · 11 min ago', type: 'warning' },
  { title: 'Firmware rollout completed', meta: '48 nodes · 46 min ago', type: 'success' },
  { title: 'New node joined the mesh', meta: 'AX-WEST-19 · 1 hr ago', type: 'info' }
];