/*
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from '@jest/globals';
import Iframe from '../src/components/Iframe';

describe('Iframe', () => {
  it('renders an iframe element with the correct src and title', () => {
    const { getByTitle } = render(
      <Iframe url="https://example.com/" title="Example" />
    );
    const iframe = getByTitle('Example') as HTMLIFrameElement;
    expect(iframe.src).toBe('https://example.com/');
  });

  it('sets the iframe width to 100%', () => {
    const { getByTitle } = render(
      <Iframe url="https://example.com/" title="Example" />
    );
    const iframe = getByTitle('Example') as HTMLIFrameElement;
    expect(iframe.width).toBe('100%');
  });

  it('sets the iframe height to 100% if fullsize prop is not provided', () => {
    const { getByTitle } = render(
      <Iframe url="https://example.com/" title="Example" />
    );
    const iframe = getByTitle('Example') as HTMLIFrameElement;
    expect(iframe.style.height).toBe('100%');
    expect(iframe.style.flexGrow).toBe('');
  });

  it('sets the iframe height to auto if fullsize prop is provided', () => {
    const { getByTitle } = render(
      <Iframe url="https://example.com/" title="Example" fullsize />
    );
    const iframe = getByTitle('Example') as HTMLIFrameElement;
    expect(iframe.style.flexGrow).toBe('1');
    expect(iframe.style.height).toBe('');
  });
});
