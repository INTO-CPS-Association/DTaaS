import { List, ListItem, ListItemText } from '@mui/material';
import useCart from 'store/CartAccess';
import { LibraryAsset } from '@into-cps-association/dt-automation';

/**
 * What is in the selection, one asset per row.
 *
 * This used to be a bare `ul`, so it arrived with the browser's own bullets and
 * indent in the middle of a themed page, and a long path ran past the panel
 * instead of wrapping.
 */
function CartList() {
  const { state } = useCart();
  return (
    <List dense disablePadding>
      {state.assets.map((asset) => (
        <CartItemRender
          key={`${asset.path}-${String(asset.isPrivate)}`}
          asset={asset}
        />
      ))}
    </List>
  );
}

function CartItemRender({ asset }: Readonly<{ asset: LibraryAsset }>) {
  const displayPath = asset.isPrivate ? asset.path : `common/${asset.path}`;

  return (
    <ListItem disableGutters sx={{ py: 0.25 }}>
      <ListItemText
        primary={displayPath}
        slotProps={{
          primary: { variant: 'body2', sx: { wordBreak: 'break-all' } },
        }}
      />
    </ListItem>
  );
}

export default CartList;
