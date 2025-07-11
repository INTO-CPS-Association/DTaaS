import * as React from 'react';
import { Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
  getConfigIcon,
  ConfigItem,
  loadingComponent,
} from 'route/config/ConfigItems';
import { cleanup, render, screen } from '@testing-library/react';

jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: jest.requireActual('@mui/material/CircularProgress').default,
}));

describe('ConfigItem', () => {
  afterEach(() => {
    cleanup();
  });

  test('getConfigIcon returns a CheckCircleIcon when the status is OK or undefined', () => {
    const validation = { value: 'value', status: 200 };
    const label = 'label';
    const result = getConfigIcon(validation, label);
    expect(result).toEqual(
      <Tooltip title={`${label} field is configured correctly.`}>
        <CheckCircleIcon color="success" data-testid="success-icon" />
      </Tooltip>,
    );
  });

  test('getConfigIcon returns an ErrorOutlineIcon when the status is not OK or undefined', () => {
    const validation = { value: 'value', status: 400 };
    const label = 'label';
    const result = getConfigIcon(validation, label);
    expect(result).toEqual(
      <Tooltip
        title={`${label} field may not be configured correctly. value responded with status code 400.`}
      >
        <ErrorOutlineIcon color="warning" data-testid="warning-icon" />
      </Tooltip>,
    );
  });

  test('getConfigIcon returns an ErrorOutlineIcon when the validation has an error', () => {
    const validation = { error: 'error' };
    const label = 'label';
    const result = getConfigIcon(validation, label);
    expect(result).toEqual(
      <Tooltip title={`${label} threw the following error: error`}>
        <ErrorOutlineIcon color="error" data-testid="error-icon" />
      </Tooltip>,
    );
  });

  test('ConfigItem renders correctly', () => {
    render(
      <ConfigItem
        label="label"
        value="value"
        validation={{ value: 'value', status: 200 }}
      />,
    );
    expect(screen.getByText(/value/i)).toHaveProperty(
      'innerHTML',
      '<strong>label:</strong> value',
    );
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
  });

  test('loadingComponent renders correctly', () => {
    render(loadingComponent());
    expect(screen.getByText(/Verifying configuration/i)).toBeInTheDocument();
    expect(screen.getByTestId('loading-icon')).toBeInTheDocument();
  });
});
