import { Component } from 'react';
import { ErrorState } from '../ui/Feedback';

export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('UI error:', error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="container-page py-16">
        <ErrorState title="We hit a snag" error={{ message: 'This page failed to load. Your data is safe.' }} onRetry={() => { this.setState({ error: null }); }} />
      </div>
    );
  }
}
