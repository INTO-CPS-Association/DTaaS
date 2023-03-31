import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import RecentRuns from 'components/RecentRuns';

describe('RecentRuns component', () => {
  test('renders table with rows', () => {
    render(<RecentRuns />);
    // Check if table headers exist
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  test('renders see more link', () => {
    render(<RecentRuns />);
    // Check if see more link exists
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  test('prevents default action when see more link is clicked', () => {
    render(<RecentRuns />);
    const seeMoreLink = screen.getByRole('link');
    // Simulate click event on see more link
    const clickEvent = createEvent.click(seeMoreLink);
    fireEvent(seeMoreLink, clickEvent);
    expect(clickEvent.defaultPrevented).toBeTruthy();
  });
});
