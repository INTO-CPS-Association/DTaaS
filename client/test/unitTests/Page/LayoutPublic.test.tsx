import LayoutPublic from 'page/LayoutPublic';
import {
  TestComponentIdList,
  basicLayoutTestsWithSingleComponent,
  itHasMultipleChildren,
  itHasSingleChild,
  renderLayoutWithRouter,
} from './page.testUtils';

const PublicTestComponentId = 'public-component';

describe('LayoutPublic component with one element', () => {
  beforeEach(() =>
    renderLayoutWithRouter(LayoutPublic, [PublicTestComponentId]),
  );

  basicLayoutTestsWithSingleComponent();

  itHasSingleChild(PublicTestComponentId);
});

describe('LayoutPublic component with multiple elements', () => {
  beforeEach(() => {
    renderLayoutWithRouter(LayoutPublic, TestComponentIdList);
  });

  itHasMultipleChildren(TestComponentIdList);
});
