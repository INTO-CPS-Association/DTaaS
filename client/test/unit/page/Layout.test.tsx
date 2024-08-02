import { screen } from '@testing-library/react';
import Layout from 'page/Layout';
import {
  TestComponentIdList,
  basicLayoutTestsWithSingleComponent,
  itHasMultipleChildren,
  itHasSingleChild,
  renderLayoutWithRouter,
} from './page.testUtils';

jest.unmock('page/Layout');

const TestComponentId = 'component';

describe('Layout component with one element', () => {
  beforeEach(() => {
    renderLayoutWithRouter(Layout, [TestComponentId]);
  });

  basicLayoutTestsWithSingleComponent();

  itHasSingleChild(TestComponentId);

  it('has menu and toolbar for spacing', () => {
    const menu = screen.getByTestId('menu');
    const toolbar = screen.getByTestId('toolbar');
    expect(menu).toBeInTheDocument();
    expect(toolbar).toBeInTheDocument();
  });
});

describe('Layout component with multiple elements', () => {
  beforeEach(() => {
    renderLayoutWithRouter(Layout, TestComponentIdList);
  });

  itHasMultipleChildren(TestComponentIdList);
});
