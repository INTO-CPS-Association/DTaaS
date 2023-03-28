import * as React from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import Logs from 'route/history/Logs';

describe('Logs', () => {
    
  test('renders title', () => {
    render(<Logs />);
    const titleElement = screen.getByText(/Logs/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('renders body text', () => {
    render(<Logs />);
    const bodyElement = screen.getByText(/Lorem ipsum dolor sit amet/i);
    expect(bodyElement).toBeInTheDocument();
  });

  test('renders "See more" link', () => {
    render(<Logs />);
    const linkElement = screen.getByText(/See more/i);
    expect(linkElement).toBeInTheDocument();
  });

  test('prevents default action when "See more" link is clicked', () => {
    render(<Logs />);
    const seeMoreLink = screen.getByText('See more');
    // Simulate click event on see more link
    const clickEvent = createEvent.click(seeMoreLink);
    fireEvent(seeMoreLink,clickEvent);
    expect(clickEvent.defaultPrevented).toBeTruthy();
  });
});