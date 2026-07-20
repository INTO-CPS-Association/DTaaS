import { Dispatch, SetStateAction } from 'react';
import AssetActionButton from 'components/asset/AssetActionButton';

interface DeleteButtonProps {
  readonly assetName: string;
  readonly setShowDelete: Dispatch<React.SetStateAction<boolean>>;
}

const handleToggleDeleteDialog = (
  setShowDelete: Dispatch<SetStateAction<boolean>>,
) => {
  setShowDelete(true);
};

function DeleteButton({ assetName, setShowDelete }: DeleteButtonProps) {
  return (
    <AssetActionButton
      action="delete"
      assetName={assetName}
      label="Delete"
      onClick={() => handleToggleDeleteDialog(setShowDelete)}
    />
  );
}

export default DeleteButton;
