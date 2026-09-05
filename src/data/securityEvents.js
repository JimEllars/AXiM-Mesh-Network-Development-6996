export const securityEventsStorageKey = 'axim-security-events';

export const initialSecurityEvents = [
  {
    id: 'SEC-2048',
    title: 'Certificate rotation scheduled',
    detail: '12 nodes · Today, 14:00',
    description: 'Certificates for the central mesh group are queued for automatic rotation.',
    source: 'Certificate service',
    detectedAt: 'Today, 09:42',
    severity: 'Low',
    type: 'success',
    status: 'Open',
    resolutionNote: ''
  },
  {
    id: 'SEC-2047',
    title: 'Unrecognized access attempt blocked',
    detail: 'Gateway 04 · 38 min ago',
    description: 'An access attempt from an unrecognized endpoint was blocked by gateway policy.',
    source: 'Gateway 04',
    detectedAt: 'Today, 09:04',
    severity: 'High',
    type: 'warning',
    status: 'Open',
    resolutionNote: ''
  },
  {
    id: 'SEC-2046',
    title: 'Encryption keys synchronized',
    detail: 'All regions · 1 hr ago',
    description: 'Encryption keys were synchronized successfully across all active regions.',
    source: 'Key management service',
    detectedAt: 'Today, 08:12',
    severity: 'Low',
    type: 'success',
    status: 'Open',
    resolutionNote: ''
  }
];

export function loadSecurityEvents() {
  try {
    const stored = window.localStorage.getItem(securityEventsStorageKey);
    return stored ? JSON.parse(stored) : initialSecurityEvents;
  } catch {
    return initialSecurityEvents;
  }
}