/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from '@jest/globals';
import '@testing-library/jest-dom/extend-expect';

import Iframe from '../src/components/Iframe';

describe('Iframe', () => {
  const url = 'https://example.com/';
  const title = 'Example website';

  it('renders an iframe element with correct src and title', () => {
    const { getByTitle } = render(<Iframe url={url} title={title} />);
    const iframe = getByTitle(title);
    expect(iframe).toHaveProperty('src', url);
  });

  it('renders an iframe element with correct width', () => {
    const { getByTitle } = render(<Iframe url={url} title={title} />);
    const iframe = getByTitle(title);
    expect(iframe).toHaveProperty('width', '100%');
  });

  // it('renders an iframe element with fullsize style when fullsize prop is true', () => {
  //   const { getByTitle } = render(
  //     <Iframe url={url} title={title} fullsize={true} />
  //   );
  //   const iframe = getByTitle(title);
  //   expect(iframe).toHaveStyle({ flexGrow: 1 });
  // });

  // it('renders an iframe element with height style when fullsize prop is false', () => {
  //   const { getByTitle } = render(
  //     <Iframe url={url} title={title} fullsize={false} />
  //   );
  //   const iframe = getByTitle(title);
  //   expect(iframe).toHaveStyle({ height: '100%' });
  // });
});
