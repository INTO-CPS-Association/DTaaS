import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MenuItems from 'page/MenuItems';

const menuEntries = [
  { name: 'Library', link: '/library' },
  { name: 'Digital Twins', link: '/digitaltwins' },
  { name: 'Workbench', link: '/workbench' },
];

const renderMenu = (open: boolean, pathname = '/') => {
  globalThis.history.pushState({}, 'Test page', pathname);
  render(
    <MemoryRouter>
      <MenuItems open={open} />
    </MemoryRouter>,
  );
};

const getButton = (name: string) =>
  screen.getByText(name).closest('[role="button"]') as HTMLElement;

const getTextRoot = (name: string) =>
  screen.getByText(name).closest('.MuiListItemText-root') as HTMLElement;

describe('MenuItems', () => {
  it('renders every menu item with its label and link', () => {
    renderMenu(true);

    menuEntries.forEach((entry) => {
      expect(screen.getByRole('link', { name: entry.name })).toHaveAttribute(
        'href',
        entry.link,
      );
    });
  });

  it('highlights only the item matching the current route', () => {
    renderMenu(true, '/library');

    expect(getButton('Library').style.backgroundColor).toBe('lightgray');
    expect(getButton('Digital Twins').style.backgroundColor).toBe('');
    expect(getButton('Workbench').style.backgroundColor).toBe('');
  });

  it('shows item labels when the drawer is open', () => {
    renderMenu(true);

    menuEntries.forEach((entry) => {
      expect(getTextRoot(entry.name)).toHaveStyle({ opacity: '1' });
    });
  });

  it('hides item labels when the drawer is collapsed', () => {
    renderMenu(false);

    menuEntries.forEach((entry) => {
      expect(getTextRoot(entry.name)).toHaveStyle({ opacity: '0' });
    });
  });
});
