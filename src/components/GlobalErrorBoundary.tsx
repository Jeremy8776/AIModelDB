import React from "react";

export class GlobalErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any, info: any) {
    // You can log error here
    // console.error(error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding: 40, color: 'red', background: '#fff', fontFamily: 'monospace'}}>
          <h2>App Error</h2>
          <pre>{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
