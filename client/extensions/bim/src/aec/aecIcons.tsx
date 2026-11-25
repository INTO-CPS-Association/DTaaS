/**
 * The icon each option of the `aec` substrate is drawn with. The choices are
 * the Buildings page's, from the client's own icon set, so the two toolbars
 * look the same. A name with no icon falls back to a neutral one.
 */

import type { ReactElement } from 'react';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
// `HelpOutline` is gone from @mui/icons-material 9. `HelpOutlined` is the
// same outlined question mark.
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import LayersClearIcon from '@mui/icons-material/LayersClear';
import OpacityIcon from '@mui/icons-material/Opacity';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import UndoIcon from '@mui/icons-material/Undo';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const ICONS: Record<string, ReactElement> = {
  heatmap: <ThermostatIcon fontSize="small" />,
  transparency: <OpacityIcon fontSize="small" />,
  slabs: <LayersClearIcon fontSize="small" />,
  hover: <HighlightAltIcon fontSize="small" />,
  hide: <VisibilityOffIcon fontSize="small" />,
  restore: <UndoIcon fontSize="small" />,
  top: <VerticalAlignTopIcon fontSize="small" />,
  front: <CropSquareIcon fontSize="small" />,
  side: <BlurOnIcon fontSize="small" />,
  fit: <CenterFocusStrongIcon fontSize="small" />,
  reset: <RestartAltIcon fontSize="small" />,
  fullscreen: <FullscreenIcon fontSize="small" />,
  help: <HelpOutlineIcon fontSize="small" />,
};

export default function iconFor(name: string): ReactElement {
  return ICONS[name] ?? <ViewInArIcon fontSize="small" />;
}
