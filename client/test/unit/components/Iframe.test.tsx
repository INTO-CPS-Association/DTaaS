import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Iframe from 'components/Iframe';
import { log } from 'util/logger/logger';

jest.mock('util/logger/logger', () => ({
  log: jest.fn(),
}));

describe('Iframe', () => {
  let iframe: HTMLIFrameElement;

  beforeEach(() => {
    render(<Iframe url="https://example.com/" title="Example" />);
    iframe = screen.getByTitle('Example');
  });

  it('renders an iframe element with the correct src and title', () => {
    expect(iframe.src).toBe('https://example.com/');
  });

  describe('Iframe fullsize', () => {
    it('will grow in horizontal direction', () => {
      expect(iframe.width).toBe('100%');
    });

    it('will grow in vertical direction', () => {
      expect(iframe.style.flexGrow).toBe('1');
      expect(iframe.style.height).toBe('');
    });
  });

  describe('focus logging', () => {
    const setActiveElement = (element: Element) => {
      Object.defineProperty(document, 'activeElement', {
        configurable: true,
        get: () => element,
      });
    };
    const setDocumentFocus = (hasFocus: boolean) => {
      Object.defineProperty(document, 'hasFocus', {
        configurable: true,
        value: () => hasFocus,
      });
    };
    const setVisibility = (visibilityState: DocumentVisibilityState) => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibilityState,
      });
    };
    const waitForBlurCheck = () =>
      new Promise((resolve) => {
        globalThis.setTimeout(resolve, 0);
      });

    beforeEach(() => {
      setDocumentFocus(true);
      setVisibility('visible');
    });

    afterEach(() => {
      Reflect.deleteProperty(document, 'activeElement');
      Reflect.deleteProperty(document, 'hasFocus');
      Reflect.deleteProperty(document, 'visibilityState');
    });

    it('logs a single click when focus moves into the iframe', async () => {
      setActiveElement(iframe);

      fireEvent.blur(globalThis.window);
      fireEvent.blur(globalThis.window);

      await waitFor(() => expect(log).toHaveBeenCalledTimes(1));
      expect(log).toHaveBeenCalledWith({
        event: 'click',
        page: globalThis.location.pathname,
        element: 'iframe',
        label: 'Example',
      });
    });

    it('logs again after a click on the parent page', async () => {
      setActiveElement(iframe);

      fireEvent.blur(globalThis.window);
      await waitFor(() => expect(log).toHaveBeenCalledTimes(1));
      fireEvent.click(document);
      fireEvent.blur(globalThis.window);

      await waitFor(() => expect(log).toHaveBeenCalledTimes(2));
    });

    it('does not log when the page is hidden during blur', async () => {
      setActiveElement(iframe);
      setVisibility('hidden');

      fireEvent.blur(globalThis.window);

      await waitForBlurCheck();
      expect(log).not.toHaveBeenCalled();
    });

    it('does not log when the document has lost focus', async () => {
      setActiveElement(iframe);
      setDocumentFocus(false);

      fireEvent.blur(globalThis.window);

      await waitForBlurCheck();
      expect(log).not.toHaveBeenCalled();
    });
  });
});
