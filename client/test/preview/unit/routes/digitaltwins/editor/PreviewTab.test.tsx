import { render, screen } from '@testing-library/react';
import PreviewTab from 'preview/route/digitaltwins/editor/PreviewTab';
import * as React from 'react';

describe('PreviewTab', () => {
  it('renders PreviewTab with markdown content', () => {
    render(<PreviewTab fileContent="fileContent" fileType="md" />);
    expect(screen.getByText('fileContent')).toBeInTheDocument();
  });

  it('renders PreviewTab with json content', () => {
    render(<PreviewTab fileContent="fileContent" fileType="json" />);
    expect(screen.getByText('fileContent')).toBeInTheDocument();
  });

  it('renders PreviewTab with yaml content', () => {
    render(<PreviewTab fileContent="fileContent" fileType="yaml" />);
    expect(screen.getByText('fileContent')).toBeInTheDocument();
  });
});
