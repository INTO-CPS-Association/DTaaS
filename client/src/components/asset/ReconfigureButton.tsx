import { Dispatch, SetStateAction } from 'react';
import AssetActionButton from 'components/asset/AssetActionButton';

interface ReconfigureButtonProps {
  readonly assetName: string;
  readonly setShowReconfigure: Dispatch<SetStateAction<boolean>>;
}

export const handleToggleReconfigureDialog = (
  setShowReconfigure: Dispatch<SetStateAction<boolean>>,
) => {
  setShowReconfigure((prev) => !prev);
};

function ReconfigureButton({
  assetName,
  setShowReconfigure,
}: ReconfigureButtonProps) {
  return (
    <AssetActionButton
      action="reconfigure"
      assetName={assetName}
      label="Reconfigure"
      onClick={() => handleToggleReconfigureDialog(setShowReconfigure)}
    />
  );
}

export default ReconfigureButton;
