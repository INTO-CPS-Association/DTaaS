import { render, screen } from '@testing-library/react';
import { ConfigItem, getConfigIcon } from 'route/config/ConfigItems';
import { ValidationType } from 'util/configUtil';

describe('ConfigItems', () => {
  describe('getConfigIcon', () => {
    it('renders error icon when validation has error', () => {
      const validation: ValidationType = {
        value: '',
        status: undefined,
        error: 'Test error',
      };

      const result = getConfigIcon(validation, 'testLabel');
      const { container } = render(result);

      expect(
        container.querySelector('[data-testid="error-icon"]'),
      ).toBeInTheDocument();
    });

    it('renders success icon when validation status is OK', () => {
      const validation: ValidationType = {
        value: 'http://localhost',
        status: 200,
        error: undefined,
      };

      const result = getConfigIcon(validation, 'testLabel');
      const { container } = render(result);

      expect(
        container.querySelector('[data-testid="success-icon"]'),
      ).toBeInTheDocument();
    });

    it('renders success icon when validation status is undefined', () => {
      const validation: ValidationType = {
        value: 'value',
        status: undefined,
        error: undefined,
      };

      const result = getConfigIcon(validation, 'testLabel');
      const { container } = render(result);

      expect(
        container.querySelector('[data-testid="success-icon"]'),
      ).toBeInTheDocument();
    });

    it('renders warning icon when validation status is not OK', () => {
      const validation: ValidationType = {
        value: 'http://localhost',
        status: 500,
        error: undefined,
      };

      const result = getConfigIcon(validation, 'testLabel');
      const { container } = render(result);

      expect(
        container.querySelector('[data-testid="warning-icon"]'),
      ).toBeInTheDocument();
    });
  });

  describe('ConfigItem', () => {
    it('renders config item with label and value', () => {
      const validation: ValidationType = {
        value: 'http://localhost',
        status: 200,
        error: undefined,
      };

      render(
        <ConfigItem
          label="Test Label"
          value="test value"
          validation={validation}
        />,
      );

      expect(screen.getByText(/Test Label:/)).toBeInTheDocument();
      expect(screen.getByText(/test value/)).toBeInTheDocument();
    });

    it('renders with default validation when none provided', () => {
      render(
        <ConfigItem
          label="Test Label"
          value="test value"
          validation={undefined as ValidationType | undefined}
        />,
      );

      expect(screen.getByText(/Test Label:/)).toBeInTheDocument();
      expect(screen.getByText(/test value/)).toBeInTheDocument();
    });

    it('renders tooltip with proper container when root element exists', () => {
      const rootDiv = document.createElement('div');
      rootDiv.id = 'root';
      document.body.appendChild(rootDiv);

      const validation: ValidationType = {
        value: 'value',
        status: 200,
        error: undefined,
      };

      const { container } = render(
        <ConfigItem
          label="Test Label"
          value="test value"
          validation={validation}
        />,
        { container: rootDiv },
      );

      expect(
        container.querySelector('[data-testid="success-icon"]'),
      ).toBeInTheDocument();

      rootDiv.remove();
    });

    it('renders tooltip without container when root element does not exist', () => {
      const validation: ValidationType = {
        value: 'value',
        status: 200,
        error: undefined,
      };

      render(
        <ConfigItem
          label="Test Label"
          value="test value"
          validation={validation}
        />,
      );

      expect(screen.getByText(/Test Label:/)).toBeInTheDocument();
    });

    it('applies popper container to root element when root exists', () => {
      const rootDiv = document.createElement('div');
      rootDiv.id = 'root';
      document.body.appendChild(rootDiv);

      const validation: ValidationType = {
        value: 'http://localhost',
        status: 200,
        error: undefined,
      };

      const { container } = render(
        <ConfigItem
          label="API_URL"
          value="http://localhost"
          validation={validation}
        />,
        { container: rootDiv },
      );

      // Verify the tooltip is rendered with the icon
      expect(
        container.querySelector('[data-testid="success-icon"]'),
      ).toBeInTheDocument();

      rootDiv.remove();
    });
  });
});
