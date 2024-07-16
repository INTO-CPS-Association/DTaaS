import * as React from 'react';
import { render, screen } from '@testing-library/react';
import Menu from 'page/Menu';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

jest.mock('page/Menu', () => ({
  ...jest.requireActual('page/Menu'),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

describe('Menu', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: {} });
    (useSelector as jest.Mock).mockImplementation(
      (selector: (state: RootState) => object) =>
        selector({
          menu: { isOpen: false },
          auth: { userName: '' },
        }),
    );
    (useDispatch as jest.Mock).mockReturnValue(jest.fn());
    render(
      <MemoryRouter>
        <Menu />
      </MemoryRouter>,
    );
  });

  it('renders the Menu correctly', () => {
    expect(screen.getByTestId(/toolbar/)).toBeInTheDocument();

    const chevronLeftIcon = screen.getByTestId(/ChevronLeftIcon/);
    expect(chevronLeftIcon).toBeInTheDocument();
    const chevronLeftButton = chevronLeftIcon.closest('button');
    expect(chevronLeftButton).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Library/ })).toBeInTheDocument();
    expect(screen.getByTestId(/ExtensionIcon/)).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /Digital Twins/ }),
    ).toBeInTheDocument();
    expect(screen.getByTestId(/PeopleIcon/)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Workbench/ })).toBeInTheDocument();
    expect(screen.getByTestId(/EngineeringIcon/)).toBeInTheDocument();
  });
});
