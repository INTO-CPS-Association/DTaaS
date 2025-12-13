import { createElement, Children, ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import { TabData } from 'components/tab/subcomponents/TabRender';
import SettingsForm from 'route/account/SettingsForm';

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
  const name = user?.profile.preferred_username ?? '';
  const pfp = user?.profile.picture;
  const profileUrl = user?.profile.profile;

  const groups = (user?.profile.groups as string[] | string | undefined) ?? [];
  const isGroupsAString = typeof groups === 'string';
  const groupsArray = isGroupsAString ? [groups] : groups;
  const groupParagraph = GroupParagraph(groupsArray, name);

  return (
    <div>
      <h2>Profile</h2>
      <img src={pfp} alt="Avatar" data-testid="profile-picture" />
      <p>
        The username is <b>{name}</b>. You can edit your profile details and
        change password on{' '}
        <b>
          <a href={profileUrl} target="_blank" rel="noreferrer">
            SSO OAuth Provider.
          </a>
        </b>
      </p>
      {groupParagraph}
    </div>
  );
}

function SettingsTab() {
  const profileUrl = useAuth().user?.profile.profile;
  return (
    <div>
      <h2>Settings</h2>
      <p>
        Edit the profile on{' '}
        <b>
          <a href={profileUrl}>SSO OAuth Provider.</a>
        </b>
      </p>

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
