import * as React from 'react';
// Will contain mocks of relevant components.

jest.mock('components/LinkButtons', () => ({
  default: () => <div role="button">Button</div>,
}));
