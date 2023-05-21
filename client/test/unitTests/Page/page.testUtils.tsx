import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { generateTestDivs } from '../testUtils';

export const TestComponentIdList = ['component1', 'component2', 'component3'];

export function renderLayoutWithRouter(
  Layout: (props: { children: React.ReactElement[] }) => React.ReactElement,
  Children: string[]
) {
  render(<Layout>{generateTestDivs(Children)}</Layout>, {
    wrapper: BrowserRouter,
  });
}

export function basicLayoutTestsWithSingleComponent() {
  it('renders without crashing', () => {
    expect(true);
  });

  it('has a main', () => {
    const container = screen.getByRole('main');
    expect(container).toBeInTheDocument();
  });

  it('has footer', () => {
    const footer = screen.getByTestId('footer');
    expect(footer).toBeInTheDocument();
  });
}

export function itHasSingleChild(testId: string) {
  it(`has a single child with the test-id ${testId}`, () => {
    const div = screen.getByTestId(testId);
    expect(div).toBeInTheDocument();
  });
}

export function itHasMultipleChildren(testIds: string[]) {
  it(`has multiple children (${testIds.length})`, () => {
    testIds.forEach((testId) => {
      const div = screen.getByTestId(testId);
      expect(div).toBeInTheDocument();
    });
  });
}
