/**
 * @jest-environment jsdom
 */
import React from 'react';
import ReactDOM from 'react-dom';
import DigitalTwins from '../src/route/digitaltwins/DigitalTwins';

test.skip('renders without crashing', () => {
  const div = document.createElement('div');

  /* jshint ignore:start */
  ReactDOM.render(<DigitalTwins />, div);
  /* jshint ignore:end */
});
