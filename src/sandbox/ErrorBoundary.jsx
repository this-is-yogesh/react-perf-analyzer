import { Component } from 'react';

/**
 * Catches runtime crashes thrown during sandboxed component execution
 * (e.g. TypeError, undefined property access, bad render logic) so that
 * the analyzer app never crashes or blanks out.
 */
export class SandboxErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.error) {
      return null;
    }
    return this.props.children;
  }
}
