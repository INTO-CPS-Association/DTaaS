import { Button } from '@mui/material';

interface AssetActionButtonProps {
  readonly action: string;
  readonly assetName: string;
  readonly label: string;
  readonly onClick: () => void;
}

function AssetActionButton({
  action,
  assetName,
  label,
  onClick,
}: AssetActionButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={onClick}
      data-logger-element="button"
      data-logger-label={label}
      data-logger-context={JSON.stringify({
        dt: { name: assetName, button: action },
      })}
    >
      {label}
    </Button>
  );
}

export default AssetActionButton;
