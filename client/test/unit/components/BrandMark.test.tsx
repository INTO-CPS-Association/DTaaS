import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import BrandMark from 'components/BrandMark';

describe('BrandMark', () => {
  it('renders at the default size when none is given', () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders at an explicit size', () => {
    const { container } = render(<BrandMark size={56} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
