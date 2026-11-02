import { Component, type ReactNode } from 'react';

interface ConformanceBoundaryProps {
  readonly onError: (error: unknown) => void;
  readonly children: ReactNode;
}

interface ConformanceBoundaryState {
  readonly failed: boolean;
}

/** Captures render, effect and lazy-import errors of a mounted element. */
class ConformanceBoundary extends Component<
  ConformanceBoundaryProps,
  ConformanceBoundaryState
> {
  constructor(props: ConformanceBoundaryProps) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): ConformanceBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default ConformanceBoundary;
