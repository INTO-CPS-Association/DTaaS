import { render, screen } from '@testing-library/react';
import Iframe from 'components/Iframe';

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
});
