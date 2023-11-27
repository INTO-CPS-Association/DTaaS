import * as React from 'react';
import LinkButtons, { LinkIcons } from 'components/LinkButtons';
import { render, screen } from '@testing-library/react';
import { KeyLinkPair } from 'util/envUtil';
import userEvent from '@testing-library/user-event';

jest.deepUnmock('components/LinkButtons');

const buttons: KeyLinkPair[] = [
  { key: 'TERMINAL', link: 'https://example.com/terminal' },
  { key: 'VNCDESKTOP', link: 'https://example.com/desktop' },
  { key: 'NO_ICON', link: 'https://example.com/noicon' },
];

const getButton = (key: string) =>
  screen.getByRole('link', { name: `${LinkIcons[key].name ?? key}-btn` });

const getLabel = (key: string) =>
  screen.getByRole('heading', { level: 6, name: LinkIcons[key].name ?? key });

const getButtonIcon = (key: string) =>
  screen.getByTitle(`${LinkIcons[key].name ?? key}-btn`).children[0];

const evaluateButtonSize = (expectedSize: number) => {
  buttons.forEach((button) => {
    expect(
      getComputedStyle(getButtonIcon(button.key)).getPropertyValue('font-size'),
    ).toBe(`${expectedSize}rem`);
  });
};

describe('LinkButtons component default size', () => {
  beforeEach(() => {
    render(<LinkButtons buttons={buttons} />);
  });

  it('should render icon buttons with labels and links', () => {
    buttons.forEach((button) => {
      expect(getButton(button.key).parentElement).toHaveAttribute(
        'aria-label',
        button.link,
      );
      expect(getLabel(button.key).tagName).toBe('H6');
    });
  });

  it('opens a new tab with the link when clicked on the button', async () => {
    window.open = jest.fn();

    await buttons.reduce(async (promise, button) => {
      await promise;
      await userEvent.click(getButton(button.key));
      expect(window.open).toHaveBeenCalledWith(button.link, '_blank');
    }, Promise.resolve());

    expect(window.open).toHaveBeenCalledTimes(buttons.length);
  });

  it('should render icon buttons with default size when size is not specified', () => {
    evaluateButtonSize(4);
  });

  it('should set the name of key as label when icon is not part of iconLib', () => {
    expect(getLabel('NO_ICON').textContent).toBe('NO_ICON');
  });

  it('should use name from iconLib as label when avaiable', () => {
    expect(getLabel(buttons[0].key).textContent).toBe(
      LinkIcons[buttons[0].key].name,
    );
  });
});

describe('LinkButtons component with specified size', () => {
  it('should render icon buttons with specified size', () => {
    const customSize = 6;
    render(<LinkButtons buttons={buttons} size={customSize} />);

    evaluateButtonSize(customSize);
  });
});
