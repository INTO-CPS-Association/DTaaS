import { render, screen } from '@testing-library/react';
import PreviewTab from 'preview/route/digitaltwins/editor/PreviewTab';
import * as React from 'react';

describe('PreviewTab', () => {
  const fileTypes = ['md', 'json', 'yaml', 'yml', 'bash'];

  fileTypes.forEach((fileType) => {
    it(`renders PreviewTab with ${fileType} content`, () => {
      render(<PreviewTab fileContent="fileContent" fileType={fileType} />);
      expect(screen.getByText('fileContent')).toBeInTheDocument();
    });
  });
});
