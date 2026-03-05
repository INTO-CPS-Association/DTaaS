import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { addOrUpdateLibraryFile } from 'model/store/libraryConfigFiles.slice';
import { selectDigitalTwinByName } from 'route/digitaltwins/execution';
import DigitalTwin from 'model/backend/digitalTwin';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import { fetchData } from 'preview/route/digitaltwins/editor/sidebarFetchers';

interface UseSidebarLoaderProps {
  name?: string;
  tab: string;
}

interface UseSidebarLoaderResult {
  isLoading: boolean;
  digitalTwinInstance: DigitalTwin | null;
}

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
      if (name && digitalTwinData) {
        try {
          const instance = await createDigitalTwinFromData(
            digitalTwinData,
            name,
          );
          setDigitalTwinInstance(instance);
          await fetchData(instance);
        } catch {
          setDigitalTwinInstance(null);
        }
      } else {
        setDigitalTwinInstance(null);
      }

      if (tab === 'create') {
        if (assets.length > 0) {
          await Promise.all(
            assets.map(async (asset) => {
              await asset.getConfigFiles();
              asset.configFiles.forEach((configFile) => {
                dispatch(
                  addOrUpdateLibraryFile({
                    assetPath: asset.path,
                    fileName: configFile,
                    fileContent: '',
                    isNew: true,
                    isModified: false,
                    isPrivate: asset.isPrivate,
                  }),
                );
              });
            }),
          );
        }
      }
      setIsLoading(false);
    };

    loadFiles();
  }, [name, digitalTwinData, assets, dispatch, tab]);

  return { isLoading, digitalTwinInstance };
};

export default useSidebarLoader;
