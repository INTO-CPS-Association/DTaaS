import * as React from 'react';
import { useAuth } from 'react-oidc-context';
import { TabData } from 'components/tab/subcomponents/TabRender';

function ListGroups(groups: string[]): React.ReactNode[] {
  const boldGroups = groups.map((group) =>
    React.createElement('b', null, group),
  );

  const userBelongsToOneGroup = (groups.length == 1);
  if (userBelongsToOneGroup) {
    return boldGroups;
  }

  const groupListing: React.ReactNode[] = [];
  boldGroups.slice(0, -1).map(groupElement => groupListing.push(groupElement, ', '))
  groupListing.splice(groupListing.length - 1, 1, [' and ', boldGroups.slice(-1)]);
  return groupListing;
}

function GroupParagraph(groups: string[], name: React.ReactNode) {
  const userBelongsToAnyGroups = (groups.length > 0);
  if (!userBelongsToAnyGroups) {
    return (
      <p>
        <b>{name}</b> does not belong to any groups.
      </p>
    );
  }

  const groupListing = ListGroups(groups);
  const groupSuffix = (groups.length > 1) ? 's' : '';
  return (
    <p>
      <b>{name}</b> belongs to {React.Children.toArray(groupListing)} group{groupSuffix}.
    </p>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const name = (user?.profile.preferred_username as string | undefined) ?? '';
  const pfp = user?.profile.picture;
  const profileUrl = user?.profile.profile;
  const groups = (user?.profile.groups as string[] | undefined) ?? [];
  const groupParagraph = GroupParagraph(groups, name);

  return (
    <div>
      <h2>Profile</h2>
      <img src={pfp} data-testid="profile-picture" />
      <p>
        The username is <b>{name}</b>. See more details on {' '}
        <b>
          <a href={profileUrl}>SSO OAuth Provider.</a>
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
