import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TabComponent, { TabData } from 'components/tab/TabComponent';

describe('TabComponent', () => {
  test('empty tab renders', () => {
    const tabs: TabData[] = [];
    render(<TabComponent tabs={tabs} />);
    expect(true);
  });

  test('renders tabs with labels and default tab open', () => {
    const tabs = [
      { label: 'Tab 1', body: <div>Tab 1 content</div> },
      { label: 'Tab 2', body: <div>Tab 2 content</div> },
    ];
    const { getByText, queryByText } = render(<TabComponent tabs={tabs} />);
    expect(getByText('Tab 1')).toBeInTheDocument();
    expect(getByText('Tab 2')).toBeInTheDocument();

    expect(getByText('Tab 1 content')).toBeInTheDocument();
    expect(queryByText('Tab 2 content')).not.toBeInTheDocument();
  });

  test('change tab', async () => {
    const tabs = [
      { label: 'Tab 1', body: <div>Tab 1 content</div> },
      { label: 'Tab 2', body: <div>Tab 2 content</div> },
      { label: 'Tab 3', body: <div>Tab 3 content</div> },
    ];
    const { getByText, getByRole, queryByText } = render(
      <TabComponent tabs={tabs} />
    );
    const tab = getByRole('tab', { name: 'Tab 2' });

    await userEvent.click(tab);
    expect(queryByText('Tab 1 content')).not.toBeInTheDocument();
    expect(getByText('Tab 2 content')).toBeInTheDocument();
    expect(queryByText('Tab 3 content')).not.toBeInTheDocument();
  });
});
