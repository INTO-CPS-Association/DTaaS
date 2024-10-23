import { fireEvent, render, screen } from '@testing-library/react';
import Editor from 'preview/route/digitaltwins/editor/Editor';
import * as React from 'react';

jest.mock('preview/route/digitaltwins/editor/EditorTab', () => ({
  __esModule: true,
  default: () => <div>EditorTab</div>,
}));

jest.mock('preview/route/digitaltwins/editor/PreviewTab', () => ({
  __esModule: true,
  default: () => <div>PreviewTab</div>,
}));

jest.mock('preview/route/digitaltwins/editor/Sidebar', () => ({
  __esModule: true,
  default: () => <div>Sidebar</div>,
}));

describe('Editor', () => {
  beforeEach(() => {
    render(<Editor DTName="DTName" />);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('render Editor', () => {
    expect(screen.getByText('EditorTab')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
  });

  it('updates active tab on tab change', () => {
    const editor = screen.getByText('Editor');
    const preview = screen.getByText('Preview');

    expect(editor).toHaveAttribute('aria-selected', 'true');
    expect(preview).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(preview);

    expect(editor).toHaveAttribute('aria-selected', 'false');
    expect(preview).toHaveAttribute('aria-selected', 'true');
  });
});
