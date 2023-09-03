import * as React from 'react';
// Will contain mocks of relevant components.

jest.mock('components/linkButtons/LinkButtons', () => ({
  default: () => <button>Button</button>,
}));

jest.mock('components/asset/AssetCard', () => ({
  default: () => <div role="card">AssetCard</div>,
}));

jest.mock('components/asset/AddButton', () => ({
  default: () => <button>AddButton</button>,
}));

jest.mock('components/asset/AssetBoard', () => ({
  default: () => <div>AssetBoard</div>,
}));

jest.mock('components/cart/ShoppingCart', () => ({
  default: () => <div>ShoppingCart</div>,
}));
