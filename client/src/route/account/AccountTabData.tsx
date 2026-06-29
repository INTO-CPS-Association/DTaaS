import { createElement, Children, ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { TabData } from 'components/tab/subcomponents/TabRender';
import SettingsForm from 'route/account/SettingsForm';
import {
  resolveOAuthProfileUrl,
  resolveOAuthUsername,
} from 'util/auth/oauthUserProfile';

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
      <p>
        <b>{name}</b> does not belong to any groups.
      </p>
    );
  }

  const groupListing = ListGroups(groups);
  const groupSuffix = groups.length > 1 ? 's' : '';
  return (
    <p>
      <b>{name}</b> belongs to {Children.toArray(groupListing)} group
      {groupSuffix}.
    </p>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const username = resolveOAuthUsername(user?.profile);
  const pfp = user?.profile.picture;
  const profileUrl = resolveOAuthProfileUrl(user?.profile);

  const groups = (user?.profile.groups as string[] | string | undefined) ?? [];
  const isGroupsAString = typeof groups === 'string';
  const groupsArray = isGroupsAString ? [groups] : groups;
  const groupParagraph = GroupParagraph(groupsArray, username);
  const profileSettingsText = (
    <>
      You can edit your profile details and change password on{' '}
      <b>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          data-logger-element="link"
          data-logger-label="SSO Profile"
        >
          SSO OAuth Provider.
        </a>
      </b>
    </>
  );
  const profileNotAvailableText = (
    <>Your OAuth provider did not expose a profile URL.</>
  );

  return (
    <div>
      <h2>Profile</h2>
      <img src={pfp} alt="Avatar" data-testid="profile-picture" />
      <p>
        The username is <b>{username}</b>.{' '}
        {profileUrl ? profileSettingsText : profileNotAvailableText}
      </p>
      {groupParagraph}
    </div>
  );
}

function SettingsTab() {
  const profileUrl = resolveOAuthProfileUrl(useAuth().user?.profile);
  const profileSettingsText = profileUrl ? (
    <b>
      <a
        href={profileUrl}
        data-logger-element="link"
        data-logger-label="SSO Settings"
      >
        SSO OAuth Provider.
      </a>
    </b>
  ) : (
    'your SSO OAuth Provider account page.'
  );

  return (
    <div>
      <h2>Settings</h2>
      <p>Edit the profile on {profileSettingsText}</p>

      <SettingsForm />
    </div>
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
