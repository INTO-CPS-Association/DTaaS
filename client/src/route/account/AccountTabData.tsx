import { createElement, Children, ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import TabDescription from 'components/tab/TabDescription';
import { TabData } from 'components/tab/subcomponents/TabRender';
import SettingsForm from 'route/account/SettingsForm';
import {
  resolveOAuthProfileUrl,
  resolveOAuthUsername,
} from 'util/auth/oauthUserProfile';
import { radius } from 'theme/tokens';
import { isSafeHttpUrl } from 'util/safeUrl';

function ListGroups(groups: string[]): ReactNode[] {
  const boldGroups = groups.map((group) =>
    createElement('b', { key: group }, group),
  );

  const userBelongsToOneGroup = groups.length === 1;
  if (userBelongsToOneGroup) {
    return boldGroups;
  }

  const groupListing: ReactNode[] = [];
  boldGroups
    .slice(0, -1)
    .forEach((groupElement) => groupListing.push(groupElement, ', '));
  groupListing.splice(groupListing.length - 1, 1, [
    ' and ',
    boldGroups.slice(-1),
  ]);
  return groupListing;
}

function GroupParagraph(groups: string[], name: ReactNode) {
  const userBelongsToAnyGroups = groups.length > 0;
  if (!userBelongsToAnyGroups) {
    return (
      <TabDescription>
        <b>{name}</b> does not belong to any groups.
      </TabDescription>
    );
  }

  const groupListing = ListGroups(groups);
  const groupSuffix = groups.length > 1 ? 's' : '';
  return (
    <TabDescription>
      <b>{name}</b> belongs to {Children.toArray(groupListing)} group
      {groupSuffix}.
    </TabDescription>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const username = resolveOAuthUsername(user?.profile);
  const pfp = user?.profile.picture;
  const claimedUrl = resolveOAuthProfileUrl(user?.profile);
  const profileUrl = isSafeHttpUrl(claimedUrl) ? claimedUrl : undefined;

  const groups = (user?.profile.groups as string[] | string | undefined) ?? [];
  const isGroupsAString = typeof groups === 'string';
  const groupsArray = isGroupsAString ? [groups] : groups;
  const groupParagraph = GroupParagraph(groupsArray, username);
  const profileSettingsText = (
    <>
      You can edit your profile details and change password on{' '}
      <Link
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-logger-element="link"
        data-logger-label="SSO Profile"
      >
        SSO OAuth Provider.
      </Link>
    </>
  );
  const profileNotAvailableText = (
    <>Your OAuth provider did not expose a profile URL.</>
  );

  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        Profile
      </Typography>
      <Box
        component="img"
        src={pfp}
        alt="Avatar"
        data-testid="profile-picture"
        sx={{
          display: 'block',
          width: 96,
          height: 96,
          objectFit: 'cover',
          borderRadius: `${radius}px`,
          border: 1,
          borderColor: 'divider',
          mb: 2,
        }}
      />
      <TabDescription>
        The username is <b>{username}</b>.{' '}
        {profileUrl ? profileSettingsText : profileNotAvailableText}
      </TabDescription>
      {groupParagraph}
    </Box>
  );
}

function SettingsTab() {
  const claimedUrl = resolveOAuthProfileUrl(useAuth().user?.profile);
  const profileUrl = isSafeHttpUrl(claimedUrl) ? claimedUrl : undefined;
  const profileSettingsText = profileUrl ? (
    <Link
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-logger-element="link"
      data-logger-label="SSO Settings"
    >
      SSO OAuth Provider.
    </Link>
  ) : (
    'your SSO OAuth Provider account page.'
  );

  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        Settings
      </Typography>
      <TabDescription>Edit the profile on {profileSettingsText}</TabDescription>

      <SettingsForm />
    </Box>
  );
}

const tabs: TabData[] = [
  {
    label: 'Profile',
    body: <ProfileTab />,
  },
  {
    label: 'Settings',
    body: <SettingsTab />,
  },
];

export default tabs;
