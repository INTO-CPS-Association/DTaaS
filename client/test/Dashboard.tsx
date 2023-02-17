/**
 * @jest-environment jsdom
 */
import { test } from '@jest/globals';

import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import Dashboard from '../src/route/dashboard/Dashboard';

test('renders Dashboard without crashing', () => {
  const root = ReactDOM.createRoot(document.createElement('div'));
  root.render(<Dashboard />);
});
