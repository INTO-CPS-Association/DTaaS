import { act, render } from '@testing-library/react';

function InitRouteTests(component: React.ReactElement) {
  beforeEach(async () => {
    await act(async () => {
      render(component);
    });
  });

  it('renders', () => {
    expect(true);
  });
}

export default InitRouteTests;
