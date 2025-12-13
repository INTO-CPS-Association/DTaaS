import { render, screen, act } from '@testing-library/react';
import MiniDrawer from 'page/Menu';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { closeMenu, openMenu } from 'store/menu.slice';
import { useAuth } from 'react-oidc-context';
import store from 'store/store';
import userEvent from '@testing-library/user-event';
import { mockUser } from 'test/__mocks__/global_mocks';
import { closestDiv } from 'test/integration/integration.testUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

jest.mock('page/Menu', () => ({
  ...jest.requireActual('page/Menu'),
}));

describe('Menu', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue(mockUser);
    render(
      <Provider store={store}>
        <MemoryRouter>
          <MiniDrawer />
        </MemoryRouter>
      </Provider>,
    );
  });

  it('renders the Menu correctly', async () => {
    expect(screen.getByTestId(/toolbar/)).toBeInTheDocument();

    const chevronLeftIcon = screen.getByTestId(/ChevronLeftIcon/);
    expect(chevronLeftIcon).toBeInTheDocument();
    const chevronLeftButton = chevronLeftIcon.closest('button');
    expect(chevronLeftButton).toBeInTheDocument();

    await userEvent.click(chevronLeftButton!);

    const libraryButton = screen.getByRole('link', { name: /Library/ });
    expect(libraryButton).toBeInTheDocument();

    expect(screen.getByTestId(/ExtensionIcon/)).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /Digital Twins/ }),
    ).toBeInTheDocument();
    expect(screen.getByTestId(/PeopleIcon/)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Workbench/ })).toBeInTheDocument();
    expect(screen.getByTestId(/EngineeringIcon/)).toBeInTheDocument();
  });

  it('changes the width of the drawer when the isOpen state changes', () => {
    const libraryButton = screen.getByRole('link', { name: /Library/ });
    const buttonsDiv = closestDiv(libraryButton);
    expect(buttonsDiv).toHaveStyle('width:calc(56px + 1px);');

    act(() => {
      store.dispatch(openMenu());
    });

    expect(buttonsDiv).toHaveStyle('width:240px');

    act(() => {
      store.dispatch(closeMenu());
    });

    expect(buttonsDiv).toHaveStyle('width:calc(56px + 1px);');
  });
});
