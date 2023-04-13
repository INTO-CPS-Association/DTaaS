/* eslint-disable no-console */
import axios from 'axios';
import { logoutClearLocalStorage } from './utility'

// Used to get authCode from url
export function getCodeParam(): string | null {
  const queryString: string = window.location.search;
  const urlParams: URLSearchParams = new URLSearchParams(queryString);
  const codeParam: string | null = urlParams.get('code');

  return codeParam;
}

export async function getGitLabAccessCode(
  clientId: string | undefined,
  requestedScopes: string | undefined,
  redirectUri: string | undefined
): Promise<void> {
  try {
    if (
      clientId === undefined ||
      requestedScopes === undefined ||
      redirectUri === undefined
    ) {
      throw new Error('Invalid parameters');
    }
    window.location.assign(
      `https://gitlab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${requestedScopes}`
    );
  } catch (error) {
    console.error(error);
  }
}

// Used to get access token from authCode
export async function getGitLabAccessToken(
  clientId: string | undefined,
  clientSecret: string | undefined,
  redirectUrl: string | undefined,
  authCode: string | undefined,
  gitlabUrl: string | undefined
): Promise<void> {
  try {
    if (
      clientId === undefined ||
      clientSecret === undefined ||
      redirectUrl === undefined ||
      authCode === undefined ||
      gitlabUrl === undefined
    ) {
      throw new Error('Invalid parameters');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUrl);
    params.append('code', authCode);

    const response = await axios.post(gitlabUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Error fetching access token: ${response.statusText}`);
    }

    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  } catch (error) {
    console.error(error);
  }
}

export async function checkAccessTokenValidity(
  accessToken: string | null
): Promise<boolean> {
  try {
    if (accessToken === null) {
      throw new Error('No accessToken');
    }
    const response = await axios.get('https://gitlab.com/api/v4/projects', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.status === 200;
  } catch (error) {
    logoutClearLocalStorage();
    return false;
  }
}

export async function resetToken(
  CLIENT_ID: string | undefined,
  CLIENT_SECRET: string | undefined,
  GITLAB_URL: string | undefined
): Promise<void> {
  // Check if refresh token is available
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('Refresh token is not available.');
  }
  try {
    if (
      CLIENT_ID === undefined ||
      CLIENT_SECRET === undefined ||
      GITLAB_URL === undefined
    ) {
      throw new Error('Invalid parameters');
    }
    // Request new access token using refresh token
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    const response = await axios.post(GITLAB_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    // Store new tokens in local storage
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
  } catch (error) {
    console.error(`Error refreshing access token: ${error}`);
    throw error;
  }
}
