import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from 'page/NotFound';

const UNKNOWN_PATH = '/jady.pamella/tree/functions';

describe('NotFound', () => {
  beforeEach(() => {
    render(
      <MemoryRouter initialEntries={[UNKNOWN_PATH]}>
        <NotFound />
      </MemoryRouter>,
    );
  });

  it('names the page as the only heading', () => {
    expect(
      screen.getByRole('heading', { name: /This Page Does Not Exist/i }),
    ).toBeInTheDocument();
  });

  it('shows the address that failed', () => {
    // The address is what makes a misrouted workspace page diagnosable, so it
    // is the part of this page worth asserting.
    expect(screen.getByText(UNKNOWN_PATH)).toBeInTheDocument();
  });

  it('offers a way back to the start', () => {
    const link = screen.getByRole('link', { name: /Back to the Start/i });
    expect(link).toHaveAttribute('href', '/');
  });
});
