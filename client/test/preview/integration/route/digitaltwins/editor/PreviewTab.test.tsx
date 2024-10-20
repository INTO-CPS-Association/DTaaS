import { AnyAction, Store, combineReducers, configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import { setDigitalTwin } from "preview/store/digitalTwin.slice";
import DigitalTwin from "preview/util/gitlabDigitalTwin";
import * as React from "react";
import { mockGitlabInstance } from "test/preview/__mocks__/global_mocks";
import { Provider } from "react-redux";
import { render, screen } from "@testing-library/react";
import digitalTwinReducer from "preview/store/digitalTwin.slice";
import fileSlice, { addOrUpdateFile } from "preview/store/file.slice";
import PreviewTab from "preview/route/digitaltwins/editor/PreviewTab";

describe('PreviewTab', () => {
  let store: Store<any, AnyAction>;

  beforeEach(async () => {
    await React.act(async () => {
      store = configureStore({
        reducer: combineReducers({
          digitalTwin: digitalTwinReducer,
          files: fileSlice,
        }),
        middleware: getDefaultMiddleware({
          serializableCheck: false,
        }),
      });

      const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
      digitalTwin.descriptionFiles = ['file1.md', 'file2.md'];
      digitalTwin.configFiles = ['config1.json', 'config2.json'];
      digitalTwin.lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];
      
      store.dispatch(
        setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin,
        }),
      );
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders Markdown content using md.render', () => {
    const markdownContent = '# Heading\nSome **bold** text.';
    
    render(
      <Provider store={store}>
        <PreviewTab fileContent={markdownContent} fileType="md" />
      </Provider>
    );
    expect(screen.getByText('Heading')).toBeInTheDocument();
    
    expect(screen.getByText((content, element) =>
      content.startsWith('Some') && element?.tagName === 'P'
    )).toBeInTheDocument();
  
    expect(screen.getByText((content, element) =>
      content.startsWith('bold') && element?.tagName === 'STRONG'
    )).toBeInTheDocument();
  });
  
  

  it('renders JSON content correctly in Preview tab', async () => {
    const jsonFile = { name: 'config.json', content: '{"key": "value"}', isModified: false };
  
    await React.act(async () => {
      store.dispatch(addOrUpdateFile(jsonFile));
    });

    render(
        <Provider store={store}>
          <PreviewTab fileContent={jsonFile.content} fileType="json" />
        </Provider>
      );
  
    expect(screen.getByText(/"key"/)).toBeInTheDocument();
    expect(screen.getByText(/"value"/)).toBeInTheDocument();
  });
  

  it('renders YAML content correctly', () => {
    const yamlFile = { name: 'config.yaml', content: 'key: value', isModified: false };

    render(
      <Provider store={store}>
        <PreviewTab fileContent={yamlFile.content} fileType="yaml" />
      </Provider>
    );

    expect(screen.getByText(/key:/)).toBeInTheDocument();
    expect(screen.getByText(/value/)).toBeInTheDocument();
  });

  it('renders Bash content correctly', () => {
    const bashFile = { name: 'script.sh', content: 'echo "Hello World"', isModified: false };

    render(
      <Provider store={store}>
        <PreviewTab fileContent={bashFile.content} fileType="sh" />
      </Provider>
    );

    expect(screen.getByText(/echo/)).toBeInTheDocument();
  expect(screen.getByText(/"Hello World"/)).toBeInTheDocument();
  });
});
