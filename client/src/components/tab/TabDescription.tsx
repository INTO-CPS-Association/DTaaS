/**
 * The paragraph above the content of a tab, shared by the library and the
 * digital twin pages. It carries the gap to whatever follows, so the text
 * never sits flush against an embedded frame.
 */

import Typography from '@mui/material/Typography';

function TabDescription({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      {children}
    </Typography>
  );
}

export default TabDescription;
