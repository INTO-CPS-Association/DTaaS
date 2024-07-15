import * as React from 'react';
import { render } from '@testing-library/react';
import Menu from 'page/Menu'
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { MemoryRouter } from 'react-router-dom';

jest.mock('page/Menu', () => ({
  ...jest.requireActual('page/Menu')
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

describe('Menu', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector: (state: RootState) => any) =>
      selector({
        menu: { isOpen: false },
        auth: { userName: '' }
      })
    );
    (useDispatch as jest.Mock).mockReturnValue(jest.fn());
  });

  it('renders the Menu correctly', () => {
    render(
      <MemoryRouter>
        <Menu />
      </MemoryRouter>
    );
  });
});