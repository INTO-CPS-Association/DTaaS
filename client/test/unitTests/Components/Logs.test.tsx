import * as React from 'react';
import { render, screen } from '@testing-library/react';
import Logs from 'route/history/Logs';
import { itPreventsDefaultActionWhenLinkIsClicked } from '../testUtils';

jest.mock('route/history/Logs', () => ({
  default: jest.requireActual('route/history/Logs').default,
}));

describe('Logs', () => {
  beforeEach(() => {
    render(<Logs />);
  });

  test('renders title', () => {
    const titleElement = screen.getByText(/Logs/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('renders body text', () => {
    const bodyElement = screen.getByText(/Lorem ipsum dolor sit amet/i);
    expect(bodyElement).toBeInTheDocument();
  });

  test('renders "See more" link', () => {
    const linkElement = screen.getByText(/See more/i);
    expect(linkElement).toBeInTheDocument();
  });

  itPreventsDefaultActionWhenLinkIsClicked('See more');
});
