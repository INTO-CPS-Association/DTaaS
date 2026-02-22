import { useState, Dispatch, SetStateAction } from 'react';
import { CardActions } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import { Asset } from 'model/backend/Asset';
import { AssetCard } from 'components/asset/AssetCard';
import DetailsButton from 'components/asset/DetailsButton';
import ReconfigureButton from 'components/asset/ReconfigureButton';
import DeleteButton from 'components/asset/DeleteButton';
import DetailsDialog from 'route/digitaltwins/manage/DetailsDialog';
import ReconfigureDialog from 'route/digitaltwins/manage/ReconfigureDialog';
import DeleteDialog from 'route/digitaltwins/manage/DeleteDialog';

interface AssetCardManageProps {
  readonly asset: Asset;
  readonly onDelete: () => void;
}

interface CardButtonsContainerManageProps {
  readonly assetName: string;
  readonly assetPrivacy: boolean;
  readonly setShowDetails: Dispatch<SetStateAction<boolean>>;
  readonly setShowReconfigure: Dispatch<SetStateAction<boolean>>;
  readonly setShowDelete: Dispatch<SetStateAction<boolean>>;
}

function CardButtonsContainerManage({
  assetName,
  assetPrivacy,
  setShowDetails,
  setShowReconfigure,
  setShowDelete,
}: CardButtonsContainerManageProps) {
  return (
    <CardActions style={{ justifyContent: 'flex-end' }}>
      <DetailsButton
        assetName={assetName}
        setShowDetails={setShowDetails}
        assetPrivacy={assetPrivacy}
      />
      <ReconfigureButton setShowReconfigure={setShowReconfigure} />
      <DeleteButton setShowDelete={setShowDelete} />
    </CardActions>
  );
}

function AssetCardManage({ asset, onDelete }: AssetCardManageProps) {
  const [showDetailsLog, setShowDetailsLog] = useState(false);
  const [showDeleteLog, setShowDeleteLog] = useState(false);
  const [showReconfigure, setShowReconfigure] = useState(false);
  const digitalTwin = useSelector(selectDigitalTwinByName(asset.name));

  return (
    digitalTwin && (
      <>
        <AssetCard
          asset={asset}
          buttons={
            <CardButtonsContainerManage
              assetName={asset.name}
              assetPrivacy={asset.isPrivate}
              setShowDelete={setShowDeleteLog}
              setShowDetails={setShowDetailsLog}
              setShowReconfigure={setShowReconfigure}
            />
          }
        />
        <DetailsDialog
          showDialog={showDetailsLog}
          setShowDialog={setShowDetailsLog}
          name={asset.name}
          isPrivate={asset.isPrivate}
        />
        <ReconfigureDialog
          showDialog={showReconfigure}
          setShowDialog={setShowReconfigure}
          name={asset.name}
        />
        <DeleteDialog
          showDialog={showDeleteLog}
          setShowDialog={setShowDeleteLog}
          name={asset.name}
          onDelete={onDelete}
        />
      </>
    )
  );
}

export default AssetCardManage;
export type { AssetCardManageProps };
