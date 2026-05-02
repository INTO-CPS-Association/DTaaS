import { createElement, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ClearIcon from '@mui/icons-material/Clear';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { RootState } from 'store/store';
import { hideSnackbar, SnackbarItem } from 'store/snackbar.slice';

const ICONS: Record<string, React.ElementType> = {
  ClearIcon,
  PlayArrowIcon,
};

const resolveIcon = (name: string | undefined) => {
  if (!name) return undefined;
  const Component = ICONS[name];
  return Component
    ? createElement(Component, { fontSize: 'inherit' })
    : undefined;
};

const SNACKBAR_SPACING = 60;
const SNACKBAR_DURATION = 6000;

const CustomSnackbar: React.FC = () => {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.snackbar.items);
  const timeoutsReference = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const closeById = (id: number) => {
    const timeouts = timeoutsReference.current;
    const timeout = timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.delete(id);
    }
    dispatch(hideSnackbar(id));
  };

  useEffect(() => {
    const timeouts = timeoutsReference.current;
    return () => {
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout);
      }
    };
  }, []);

  useEffect(() => {
    const timeouts = timeoutsReference.current;
    const currentIds = new Set(items.map((item) => item.id));

    for (const [id, timeout] of timeouts.entries()) {
      if (!currentIds.has(id)) {
        clearTimeout(timeout);
        timeouts.delete(id);
      }
    }

    for (const item of items) {
      if (!timeouts.has(item.id)) {
        const timeout = setTimeout(() => {
          timeouts.delete(item.id);
          dispatch(hideSnackbar(item.id));
        }, SNACKBAR_DURATION);
        timeouts.set(item.id, timeout);
      }
    }
  }, [items, dispatch]);

  return (
    <>
      {items.map((item: SnackbarItem, index: number) => (
        <Snackbar
          key={item.id}
          open
          onClose={(_event, reason) => {
            if (reason === 'clickaway') return;
            closeById(item.id);
          }}
          style={{
            bottom: 24 + (items.length - 1 - index) * SNACKBAR_SPACING,
            transition: 'bottom 0.3s ease',
          }}
        >
          <Alert
            onClose={() => closeById(item.id)}
            severity={item.severity}
            icon={resolveIcon(item.icon)}
          >
            {item.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default CustomSnackbar;
