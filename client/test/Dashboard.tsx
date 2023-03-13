/**
 * @jest-environment jsdom
 */
import { describe, expect, it } from '@jest/globals';
import * as React from 'react';
import { render } from '@testing-library/react';
import Dashboard from '../src/route/dashboard/Dashboard';

describe('Dashboard', () => {
  it('renders Dashboard without crashing', () => {
    render(<Dashboard />);
    expect(true);
  });
});
