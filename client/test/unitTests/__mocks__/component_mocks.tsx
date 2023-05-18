import * as React from 'react';
// Will contain mocks of relevant components.

jest.mock('components/LinkButtons', () => ({
  default: () => <button>Button</button>,
}));

jest.mock('components/AssetBoard/AssetCard', () => ({
  default: () => <div role="card">AssetCard</div>,
}));

jest.mock('components/AssetBoard/AddButton', () => ({
  default: () => <button>AddButton</button>,
}));

jest.mock('components/AssetBoard', () => ({
  default: () => <div>AssetBoard</div>,
}));

jest.mock('components/cart/ShoppingCart', () => ({
  default: () => <div>ShoppingCart</div>,
}));
