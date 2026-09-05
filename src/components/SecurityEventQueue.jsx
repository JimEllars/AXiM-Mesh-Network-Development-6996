import React, { useMemo, useState } from 'react';
import SafeIcon from '../common/SafeIcon';

function SecurityEventQueue({ events, onSelect, onResolveAll }) {
  const [filter, setFilter] = useState('open');
  const [query, setQuery] = useState('');

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesFilter = filter === 'all' || event.status.toLowerCase() === filter;
      const searchable = `${event.id} ${event.title} ${event.source} ${event.severity}`.toLowerCase();
      return matchesFilter && searchable.includes(normalizedQuery);
    });
  }, [events, filter, query]);

  const openCount = events.filter((event) => event.status === 'Open').length;

  return (
    <section className="panel workspace-panel security-events">
      <div className="security-events-header">
        <div>
          <p className="eyebrow">Operator review queue</p>
          <h3>Security events</h3>
        </div>
        <button
          className="filter-button"
          onClick={onResolveAll}
          disabled={!openCount}
        >
          <SafeIcon name="CheckCircle" />
          Resolve all
        </button>
      </div>

      <div className="security-queue-tools">
        <label className="event-search">
          <SafeIcon name="Search" />
          <input
            aria-label="Search security events"
            placeholder="Search events..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All events</option>
        </select>
      </div>

      {visibleEvents.length > 0 ? (
        visibleEvents.map((event) => (
          <button
            className={`security-event ${event.status.toLowerCase()}`}
            key={event.id}
            onClick={() => onSelect(event)}
          >
            <span className={`event-icon ${event.type}`}>
              <SafeIcon name={event.type === 'warning' ? 'AlertTriangle' : 'Check'} />
            </span>
            <span className="security-event-copy">
              <strong>{event.title}</strong>
              <small>{event.id} · {event.detail}</small>
            </span>
            <span className={`inline-event-state ${event.status.toLowerCase()}`}>
              {event.status}
            </span>
            <SafeIcon name="ChevronRight" />
          </button>
        ))
      ) : (
        <div className="security-clear">
          <SafeIcon name={filter === 'open' ? 'Shield' : 'Search'} />
          <strong>{filter === 'open' ? 'Review queue is clear' : 'No matching events'}</strong>
          <small>
            {filter === 'open'
              ? 'All security events have been resolved.'
              : 'Try another status or search term.'}
          </small>
        </div>
      )}
    </section>
  );
}

export default SecurityEventQueue;