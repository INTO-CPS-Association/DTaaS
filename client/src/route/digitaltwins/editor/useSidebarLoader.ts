import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { initializeLibraryFile } from 'model/store/libraryConfigFiles.slice';
import { selectDigitalTwinByName } from 'route/digitaltwins/execution';
import DigitalTwin from 'model/backend/digitalTwin';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import { fetchData } from 'route/digitaltwins/editor/sidebarFetchers';
import LibraryAsset from 'model/backend/libraryAsset';
import { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';

interface UseSidebarLoaderProps {
  readonly name?: string;
  readonly tab: string;
}

interface UseSidebarLoaderResult {
  readonly isLoading: boolean;
  readonly digitalTwinInstance: DigitalTwin | null;
}

interface LoadAssetsConfig {
  readonly name?: string;
  readonly digitalTwinData: DigitalTwinData | null | undefined;
  readonly tab: string;
  readonly assets: LibraryAsset[];
}

const dispatchLibraryFiles = (
  asset: LibraryAsset,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  asset.configFiles.forEach((configFile) => {
    dispatch(
      initializeLibraryFile({
        assetPath: asset.path,
        fileName: configFile,
        fileContent: '',
        isNew: true,
        isModified: false,
        isPrivate: asset.isPrivate,
      }),
    );
  });
};

const loadCreateTabAssets = async (
  assets: LibraryAsset[],
  dispatch: ReturnType<typeof useDispatch>,
) => {
  if (assets.length === 0) return;
  await Promise.all(
    assets.map(async (asset) => {
      await asset.getConfigFiles();
      dispatchLibraryFiles(asset, dispatch);
    }),
  );
};

const shouldLoadInstance = (
  name: string | undefined,
  data: DigitalTwinData | null | undefined,
): boolean => !!name && !!data;

const loadDigitalTwinInstance = async (
  name: string,
  digitalTwinData: DigitalTwinData | null | undefined,
  setDigitalTwinInstance: (instance: DigitalTwin | null) => void,
) => {
  if (!shouldLoadInstance(name, digitalTwinData)) {
    setDigitalTwinInstance(null);
    return;
  }
  try {
    const instance = await createDigitalTwinFromData(digitalTwinData!, name);
    setDigitalTwinInstance(instance);
    await fetchData(instance);
  } catch {
    setDigitalTwinInstance(null);
  }
};

const loadAssets = async (
  config: LoadAssetsConfig,
  setDigitalTwinInstance: (instance: DigitalTwin | null) => void,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  await loadDigitalTwinInstance(
    config.name ?? '',
    config.digitalTwinData,
    setDigitalTwinInstance,
  );
  if (config.tab === 'create') {
    await loadCreateTabAssets(config.assets, dispatch);
  }
};

const useSidebarLoader = ({
  name,
  tab,
}: UseSidebarLoaderProps): UseSidebarLoaderResult => {
  const [isLoading, setIsLoading] = useState(!!name);
  const [digitalTwinInstance, setDigitalTwinInstance] =
    useState<DigitalTwin | null>(null);

  const digitalTwinData = useSelector((state: RootState) =>
    name ? selectDigitalTwinByName(name)(state) : null,
  );
  const assets = useSelector((state: RootState) => state.cart.assets);
  const dispatch = useDispatch();

  useEffect(() => {
    const loadFiles = async () => {
      await loadAssets(
        { name, digitalTwinData, tab, assets },
        setDigitalTwinInstance,
        dispatch,
      );
      setIsLoading(false);
    };

    loadFiles();
  }, [name, digitalTwinData, assets, dispatch, tab]);

  return { isLoading, digitalTwinInstance };
};

export default useSidebarLoader;
