import { TreeItem, TreeItemProps } from '@mui/x-tree-view/TreeItem';
import {
  LibraryConfigFile,
  FileState,
} from 'model/backend/interfaces/sharedInterfaces';
import LibraryAsset from 'model/backend/libraryAsset';
import { useDispatch } from 'react-redux';
import {
  handleFileClick,
  AssetOrNull,
  FileStateSetters,
} from 'route/digitaltwins/editor/sidebarFunctions';

export interface RenderContext {
  readonly label: string;
  readonly filesToRender: string[];
  readonly asset: AssetOrNull;
  readonly tab: string;
  readonly files: FileState[];
  readonly dispatch: ReturnType<typeof useDispatch>;
}

export interface RenderOptions {
  readonly library?: boolean;
  readonly libraryFiles?: LibraryConfigFile[];
  readonly assetPath?: string;
}

const getBaseLabel = (label: string, asset: AssetOrNull): string => {
  const lower = label.toLowerCase();
  if (asset instanceof LibraryAsset && !asset.isPrivate) {
    return lower.startsWith('common/') ? lower : `common/${lower}`;
  }
  return lower;
};

const getItemLabel = (item: string, asset: AssetOrNull): string =>
  asset instanceof LibraryAsset && !asset.isPrivate ? `common/${item}` : item;

export const renderFileTreeItems = (
  context: RenderContext,
  setters: FileStateSetters,
  options?: RenderOptions,
) => {
  const baseLabel = getBaseLabel(context.label, context.asset);

  return (
    <TreeItem
      key={`${baseLabel}-${context.label}`}
      itemId={`${baseLabel}-${context.label}`}
      label={context.label as TreeItemProps['label']}
    >
      {context.filesToRender.map((item, index) => {
        const itemLabel = getItemLabel(item, context.asset);
        return (
          <TreeItem
            key={`${baseLabel}-${item}-${index}`}
            itemId={`${baseLabel}-${item}`}
            label={itemLabel}
            onClick={() => {
              handleFileClick(
                { fileName: item, asset: context.asset, files: context.files },
                context.tab,
                setters,
                {
                  dispatch: context.dispatch,
                  library: options?.library,
                  libraryFiles: options?.libraryFiles,
                  assetPath: options?.assetPath,
                },
              );
            }}
          />
        );
      })}
    </TreeItem>
  );
};

export const renderFileSection = (
  context: RenderContext,
  setters: FileStateSetters,
  options?: RenderOptions,
) => {
  const baseLabel = getBaseLabel(context.label, context.asset);

  return (
    <TreeItem
      key={`${baseLabel}-${context.label}`}
      itemId={`${baseLabel}-${context.label}`}
      label={context.label}
    >
      {context.filesToRender.map((item, index) => (
        <TreeItem
          key={`${baseLabel}-${item}-${index}`}
          itemId={`${baseLabel}-${item}`}
          label={item}
          onClick={() => {
            handleFileClick(
              { fileName: item, asset: context.asset, files: context.files },
              context.tab,
              setters,
              {
                dispatch: context.dispatch,
                library: options?.library,
                libraryFiles: options?.libraryFiles,
              },
            );
          }}
        />
      ))}
    </TreeItem>
  );
};
