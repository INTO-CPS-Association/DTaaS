import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from 'page/Layout';
import {
  TestComponentIdList,
  basicLayoutTestsWithSingleComponent,
  itHasMultipleChildren,
  itHasSingleChild,
  renderLayoutWithRouter,
} from 'test/unit/page/page.testUtil';

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

describe('Layout with an explicit maxWidth', () => {
  it('uses the maxWidth it is given instead of the default', () => {
    render(
      <BrowserRouter>
        <Layout maxWidth="lg">
          <div>child</div>
        </Layout>
      </BrowserRouter>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});
