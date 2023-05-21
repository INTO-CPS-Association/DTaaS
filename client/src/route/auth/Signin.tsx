import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setUserName } from 'store/auth.slice';

import { useAuth } from 'components/AuthContext';
import Button from '@mui/material/Button';

function SignIn() {
  const dispatch = useDispatch();
  const { logIn } = useAuth();
  const navigate = useNavigate();
  const [localUsername, setLocalUsername] = React.useState<string>('');

  const handleUsernameChange = (input: string) => {
    if (!input.includes(' ')) {
      setLocalUsername(input);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!localUsername) return;
    dispatch(setUserName(localUsername));
    logIn();
    navigate('/library');
  };

  return (
    <Box
      sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        Sign in
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          value={localUsername}
          onChange={(event) => handleUsernameChange(event.target.value)}
          required
          fullWidth
          id="username"
          label="Username"
          name="username"
          autoFocus
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Sign In
        </Button>
      </Box>
    </Box>
  );
}

export default SignIn;
