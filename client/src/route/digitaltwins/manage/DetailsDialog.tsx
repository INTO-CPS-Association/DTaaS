import { Dispatch, SetStateAction } from 'react';
import { Dialog, DialogContent, DialogActions, Button } from '@mui/material';
import { Remarkable } from 'remarkable';
import 'katex/dist/katex.min.css';
// @ts-expect-error: Ignoring TypeScript error due to missing type definitions for 'remarkable-katex'.
import RemarkableKatexModule from 'remarkable-katex';
import { useSelector } from 'react-redux';
import { selectAssetByPathAndPrivacy } from 'model/store/assets.slice';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';

const RemarkableKatex =
  (RemarkableKatexModule as { default?: unknown }).default ??
  RemarkableKatexModule;

interface DetailsDialogProps {
  readonly showDialog: boolean;
  readonly setShowDialog: Dispatch<SetStateAction<boolean>>;
  readonly name: string;
  readonly isPrivate: boolean;
  readonly library?: boolean;
  readonly path?: string;
}

const handleCloseDetailsDialog = (
  setShowLog: Dispatch<SetStateAction<boolean>>,
) => {
  setShowLog(false);
};

function DetailsDialog({
  showDialog,
  setShowDialog,
  name,
  isPrivate,
  library,
  path,
}: DetailsDialogProps) {
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  const libraryAsset = useSelector(
    selectAssetByPathAndPrivacy(path || '', isPrivate),
  );

  const asset = library ? libraryAsset : digitalTwin;

  const md = new Remarkable({
    html: true,
    typographer: true,
  }).use(RemarkableKatex as never);

  return (
    <Dialog open={showDialog} maxWidth="md">
      <DialogContent dividers>
        <div
          dangerouslySetInnerHTML={{
            __html: md.render(asset!.fullDescription),
          }}
          style={{
            maxWidth: '100%',
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => handleCloseDetailsDialog(setShowDialog)}
          color="primary"
          data-logger-element="button"
          data-logger-label="Details Dialog Close"
          data-logger-context={JSON.stringify(
            library
              ? { library: { path, button: 'details-close' } }
              : { dt: { name, button: 'details-close' } },
          )}
        >
          Close
        </Button>
      </DialogActions>
      <style>{`
        img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
        }
      `}</style>
    </Dialog>
  );
}

export default DetailsDialog;
