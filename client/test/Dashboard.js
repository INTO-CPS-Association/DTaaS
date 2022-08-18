/**
 * @jest-environment jsdom
 */
import React from 'react';
import ReactDOM from 'react-dom';
import Dashboard from '../src/Dashboard';

test.skip('renders without crashing', () => {
  const div = document.createElement('div');

  /* jshint ignore:start */
  ReactDOM.render(<Dashboard />, div);
  /* jshint ignore:end */
});
