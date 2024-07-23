import * as React from 'react';
import { screen, within } from '@testing-library/react';
import Workbench from 'route/workbench/Workbench';
import {
  closestDiv,
  setupIntegrationTest,
  testFooter,
  testMenu,
  testToolbar,
} from '../integrationTestUtils';

jest.mock('components/LinkButtons', () => ({
  default: () => <div role="button">Button</div>,
}));

const setup = () => setupIntegrationTest(<Workbench />);

describe('Workbench', () => {
  beforeEach(() => {
    setup();
  });

  it('renders the Workbench and Layout correctly', () => {
    const { container } = setup();

    // Testing toolbar without buttons
    testToolbar(container);
    testMenu();
    testFooter();

    const mainHeading = screen.getByRole('heading', { level: 4 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Workbench Tools/);

    const workHeadingDiv = closestDiv(mainHeading);

    const workbenchToolsButtons = within(workHeadingDiv).getByRole('button');
    expect(workbenchToolsButtons).toBeInTheDocument();
  });
});
