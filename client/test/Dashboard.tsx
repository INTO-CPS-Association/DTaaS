/**
 * @jest-environment jsdom
 */
import { test } from '@jest/globals';

import React from 'react';
import ReactDOM from 'react-dom';
import Dashboard from '../src/route/dashboard/Dashboard';

test('renders without crashing', () => {
  const div = document.createElement('div');

  /* jshint ignore:start */
  ReactDOM.render(<Dashboard />, div);
  /* jshint ignore:end */
});
