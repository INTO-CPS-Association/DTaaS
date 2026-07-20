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

const isPublicLibraryAsset = (asset: AssetOrNull): boolean =>
  asset instanceof LibraryAsset && !asset.isPrivate;

const prefixLibraryLabel = (label: string, isPublic: boolean): string => {
  const prefix = isPublic && !label.startsWith('common/') ? 'common/' : '';
  return `${prefix}${label}`;
};

const normalizeLibraryAssetLabel = (
  label: string,
  asset: AssetOrNull,
): string => prefixLibraryLabel(label, isPublicLibraryAsset(asset));

const getBaseLabel = (label: string, asset: AssetOrNull): string =>
  normalizeLibraryAssetLabel(label.toLowerCase(), asset);

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
      data-logger-element="treeitem-section"
      data-logger-label={context.label}
    >
      {context.filesToRender.map((item, index) => {
        const itemLabel = getItemLabel(item, context.asset);
        return (
          <TreeItem
            key={`${baseLabel}-${item}-${index}`}
            itemId={`${baseLabel}-${item}`}
            label={itemLabel}
            data-logger-element="treeitem"
            data-logger-label={itemLabel}
            data-logger-context={JSON.stringify({
              file: { name: item, section: context.label },
            })}
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
      data-logger-element="treeitem-section"
      data-logger-label={context.label}
    >
      {context.filesToRender.map((item, index) => (
        <TreeItem
          key={`${baseLabel}-${item}-${index}`}
          itemId={`${baseLabel}-${item}`}
          label={item}
          data-logger-element="treeitem"
          data-logger-label={item}
          data-logger-context={JSON.stringify({
            file: { name: item, section: context.label },
          })}
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
