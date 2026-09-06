import React from 'react';

class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Component Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#10151f',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '9px',
          color: '#8490a3',
          fontFamily: "'DM Mono', monospace",
          fontSize: '12px',
          textAlign: 'center',
          margin: '10px 0'
        }}>
          Telemetry stream paused / Reconnecting
        </div>
      );
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;
