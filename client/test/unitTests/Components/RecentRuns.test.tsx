import { render, screen } from '@testing-library/react';
import * as React from 'react';
import RecentRuns from 'components/RecentRuns';
import { itPreventsDefaultActionWhenLinkIsClicked } from '../testUtils';

jest.mock('components/RecentRuns', () => ({
  default: jest.requireActual('components/RecentRuns').default,
}));

describe('RecentRuns component', () => {
  beforeEach(() => {
    render(<RecentRuns />);
  });

  test('renders table with rows', () => {
    // Check if table headers exist
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  test('renders see more link', () => {
    // Check if see more link exists
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  itPreventsDefaultActionWhenLinkIsClicked('See more');
});
