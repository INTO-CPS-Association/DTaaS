import { combineReducers, configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/state/digitalTwin.slice';
import * as React from 'react';
import { createMockDigitalTwinData } from 'test/__mocks__/global_mocks';
import { Provider } from 'react-redux';
import { act, render, screen } from '@testing-library/react';
import fileSlice, { addOrUpdateFile } from 'model/store/file.slice';
import PreviewTab from 'route/digitaltwins/editor/PreviewTab';

describe('PreviewTab', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(async () => {
    await React.act(async () => {
      store = configureStore({
        reducer: combineReducers({
          digitalTwin: digitalTwinReducer,
          files: fileSlice,
        }),
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: false,
          }),
      });

      const digitalTwinData = createMockDigitalTwinData('Asset 1');

      store.dispatch(
        setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin: digitalTwinData,
        }),
      );
    });
  });

  it('renders Markdown content using md.render', () => {
    const markdownContent = '# Heading\nSome **bold** text.';

    act(() => {
      render(
        <Provider store={store}>
          <PreviewTab fileContent={markdownContent} fileType="md" />
        </Provider>,
      );
    });
    expect(screen.getByText('Heading')).toBeInTheDocument();

    expect(
      screen.getByText(
        (content, element) =>
          content.startsWith('Some') && element?.tagName === 'P',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        (content, element) =>
          content.startsWith('bold') && element?.tagName === 'STRONG',
      ),
    ).toBeInTheDocument();
  });

  it('renders JSON content correctly in Preview tab', async () => {
    const jsonFile = {
      name: 'config.json',
      content: '{"key": "value"}',
      isNew: false,
      isModified: false,
    };

    await React.act(async () => {
      store.dispatch(addOrUpdateFile(jsonFile));
    });

    act(() => {
      render(
        <Provider store={store}>
          <PreviewTab fileContent={jsonFile.content} fileType="json" />
        </Provider>,
      );
    });

    expect(screen.getByText(/"key"/)).toBeInTheDocument();
    expect(screen.getByText(/"value"/)).toBeInTheDocument();
  });

  it('renders YAML content correctly', () => {
    const yamlFile = {
      name: 'config.yaml',
      content: 'key: value',
      isModified: false,
    };

    act(() => {
      render(
        <Provider store={store}>
          <PreviewTab fileContent={yamlFile.content} fileType="yaml" />
        </Provider>,
      );
    });

    expect(screen.getByText(/key:/)).toBeInTheDocument();
    expect(screen.getByText(/value/)).toBeInTheDocument();
  });

  it('renders Bash content correctly', () => {
    const bashFile = {
      name: 'script.sh',
      content: 'echo "Hello World"',
      isModified: false,
    };

    act(() => {
      render(
        <Provider store={store}>
          <PreviewTab fileContent={bashFile.content} fileType="sh" />
        </Provider>,
      );
    });

    expect(screen.getByText(/echo/)).toBeInTheDocument();
    expect(screen.getByText(/"Hello World"/)).toBeInTheDocument();
  });
});
