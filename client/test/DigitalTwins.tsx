/**
 * @jest-environment jsdom
 */
import { test } from '@jest/globals';

import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import DigitalTwins from '../src/route/digitaltwins/DigitalTwins';

test('renders DT without crashing', () => {
  const root = ReactDOM.createRoot(document.createElement('div'));
  root.render(<DigitalTwins/>);
});
