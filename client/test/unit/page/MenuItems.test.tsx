import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MenuItems from 'page/MenuItems';

const menuEntries = [
  { name: 'Library', link: '/library' },
  { name: 'Digital Twins', link: '/digitaltwins' },
  { name: 'Workbench', link: '/workbench' },
];

const renderMenu = (open: boolean, pathname = '/') =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <MenuItems open={open} />
    </MemoryRouter>,
  );

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

  it('marks only the item matching the current route as the current page', () => {
    renderMenu(true, '/library');

    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('link', { name: 'Digital Twins' }),
    ).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Workbench' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  // The rail clips the labels, it does not remove them. What a screen reader
  // announces has to be the same in both states.
  it.each([true, false])('names every item with open %s', (open) => {
    renderMenu(open);

    menuEntries.forEach((entry) => {
      expect(
        screen.getByRole('link', { name: entry.name }),
      ).toBeInTheDocument();
    });
  });

  it('offers a tooltip when the drawer is collapsed', async () => {
    renderMenu(false);

    await userEvent.hover(screen.getByRole('link', { name: 'Library' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Library');
  });
});
