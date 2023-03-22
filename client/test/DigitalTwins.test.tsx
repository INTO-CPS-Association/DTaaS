import { render } from '@testing-library/react';
import * as React from 'react';
import DigitalTwins from '../src/route/digitaltwins/DigitalTwins';

describe('Digital Twins', () => {
  it('Reder OK', () => {
    render(<DigitalTwins />);
    expect(true);
  });
});
