import LinkButtons, { LinkIcons } from 'components/LinkButtons';
import { render, screen } from '@testing-library/react';
import { KeyLinkPair } from 'util/envUtil';
import userEvent from '@testing-library/user-event';

jest.deepUnmock('components/LinkButtons');

const buttons: KeyLinkPair[] = [
  { key: 'VNCDESKTOP', link: 'https://example.com/desktop' },
  { key: 'GITHUB', link: 'https://example.com/github' },
];

const getButton = (key: string) =>
  screen.getByRole('link', {
    name: `${
      LinkIcons[key]?.name !== 'ToolbarIcon' ? `${LinkIcons[key].name}-btn` : ''
    }`,
  });

const getLabel = (key: string) =>
  screen.getByRole('heading', { level: 6, name: LinkIcons[key].name });

const evaluateButtonSize = (expectedSize: number) => {
  buttons.forEach((button) => {
    expect(
      getComputedStyle(getButton(button.key).children[0]).getPropertyValue(
        'font-size',
      ),
    ).toBe(`${expectedSize}rem`);
  });
};

const evaluateMarginRight = (expectedMargin: number) => {
  buttons.forEach((button) => {
    const buttonElement = getButton(button.key);
    if (buttonElement) {
      expect(
        getComputedStyle(
          buttonElement.parentElement!.parentElement!,
        ).getPropertyValue('margin-right'),
      ).toBe(`${expectedMargin}px`);
    }
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
      const labelName = LinkIcons[button.key]?.name;
      if (labelName !== 'ToolbarIcon') {
        expect(getLabel(button.key).tagName).toBe('H6');
      }
    });
  });

  it('opens a new tab with the link when clicked on the button', async () => {
    globalThis.open = jest.fn();

    await buttons.reduce(async (promise, button) => {
      await promise;
      await userEvent.click(getButton(button.key));
      expect(globalThis.open).toHaveBeenCalledWith(button.link, '_blank');
    }, Promise.resolve());

    expect(globalThis.open).toHaveBeenCalledTimes(buttons.length);
  });

  it('should render icon buttons with default size when size is not specified', () => {
    evaluateButtonSize(4);
  });

  it('should use name from iconLib as label when available', () => {
    expect(getLabel(buttons[0].key).textContent).toBe(
      LinkIcons[buttons[0].key]?.name,
    );
  });
});

describe('LinkButtons component with specified size and specified marginRight', () => {
  it('should render icon buttons with specified size and specified marginRight', () => {
    const customSize = 6;
    const customMarginRight = 40;
    render(
      <LinkButtons
        buttons={buttons}
        size={customSize}
        marginRight={customMarginRight}
      />,
    );

    evaluateButtonSize(customSize);
    evaluateMarginRight(customMarginRight);
  });
});
