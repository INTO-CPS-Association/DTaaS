/**
 * @jest-environment jsdom
 */
import { test } from '@jest/globals';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../src/route/dashboard/Dashboard';

test('renders without crashing', () => {
  const div = document.createElement('div');

  ReactDOM.render(<BrowserRouter><Dashboard /></BrowserRouter>, div);
});
