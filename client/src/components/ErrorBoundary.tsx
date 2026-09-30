/**
 * The last resort when a render throws.
 *
 * React unmounts the whole tree when a render throws and nothing catches it,
 * which leaves a blank page. Any component under the provider tree can do
 * that, and this boundary turns it into a page that says what to do.
 *
 * This is the net, not the fix. It sits inside `ThemeProvider` so the fallback
 * can use the application's own components, and wraps the provider tree, so it
 * also catches anything the providers themselves throw.
 *
 * The fallback says what to do and not what went wrong. A stack trace on
 * screen helps nobody who is signed in and stuck, and the detail belongs in
 * the console where a developer looks for it.
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The console is where the detail is useful. It never reaches the screen.
    // eslint-disable-next-line no-console
    console.error('The application stopped rendering.', error, info);
  }

  render(): ReactNode {
    const { failed } = this.state;
    const { children } = this.props;

    if (!failed) {
      return children;
    }

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          minHeight: '60vh',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="h2" component="h1">
          Something went wrong
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Reload the page. If it happens again, sign out and sign in once more.
        </Typography>
        <Button
          variant="contained"
          onClick={() => globalThis.location.reload()}
        >
          Reload
        </Button>
      </Box>
    );
  }
}

export default ErrorBoundary;
