import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from 'page/Layout';

jest.mock('page/Layout', () => ({
  default: jest.requireActual('page/Layout').default,
}));

describe('Layout component with one element', () => {
  beforeEach(() => {
    render(
      <Layout>
        <div />
      </Layout>,
      { wrapper: BrowserRouter }
    );
  });

  it('renders without crashing', () => {
    expect(true);
  });

  it('has a main', () => {
    const container = screen.getByRole('main');
    expect(container).toBeInTheDocument();
  });

  it('has menu and toolbar for spacing', () => {
    const menu = screen.getByTestId('menu');
    const toolbar = screen.getByTestId('toolbar');
    expect(menu).toBeInTheDocument();
    expect(toolbar).toBeInTheDocument();
  });

  it('has footer', () => {
    const footer = screen.getByTestId('footer');
    expect(footer).toBeInTheDocument();
  });

  it('has a single child', () => {
    render(
      <Layout>
        <div data-testid="thing" />
      </Layout>,
      { wrapper: BrowserRouter }
    );
    const div = screen.getByTestId('thing');
    expect(div).toBeInTheDocument();
  });

  it('has multiple children (2)', () => {
    render(
      <Layout>
        <div data-testid="thing" />
        <div data-testid="thing2" />
      </Layout>,
      { wrapper: BrowserRouter }
    );
    const div = screen.getByTestId('thing');
    const div2 = screen.getByTestId('thing2');
    expect(div).toBeInTheDocument();
    expect(div2).toBeInTheDocument();
  });
});
