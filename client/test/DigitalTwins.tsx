/**
 * @jest-environment jsdom
 */
import { test } from '@jest/globals';

import * as React from 'react';
import DigitalTwins from '../src/route/digitaltwins/DigitalTwins';
import * as ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';


test('renders without crashing', () => {
  const div = document.createElement('div');

  ReactDOM.render(<BrowserRouter><DigitalTwins/></BrowserRouter>, div);
});

