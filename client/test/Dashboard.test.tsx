/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable class-methods-use-this */
import Grid from '@mui/material/Grid';
import { render } from '@testing-library/react';
import * as React from 'react';
import Dashboard from '../src/route/dashboard/Dashboard';
import 'resize-observer-polyfill';

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

describe('Dashboard', () => {
  it('renders Dashboard without crashing', () => {
    window.ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver;
    render(
      <Grid container spacing={3} sx={{ minHeight: '100%' }}>
        <Dashboard />
      </Grid>
    );
    expect(true);
  });
});
