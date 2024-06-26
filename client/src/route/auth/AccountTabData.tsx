import * as React from 'react';
import { useAuth } from 'react-oidc-context';
import { TabData } from 'components/tab/subcomponents/TabRender';

function ProfileTab() {
  const { user } = useAuth();
  const name = (user?.profile.preferred_username as string | undefined) ?? "";
  const pfp = user?.profile.picture;
  const profileUrl = user?.profile.profile;
  const groups = ((user?.profile.groups as string[] | undefined) ?? []);

  const boldName = React.createElement("b", null, name);
  const boldGroups = groups.map(group => React.createElement("b", null, group));
  const groupListing: React.ReactNode[] = [];
  boldGroups.slice(0, -1).forEach((groupElement, i) => {
    const isSecondToLastGroup = (i < boldGroups.length - 2);
    const seperator = isSecondToLastGroup ? ", " : " and "
    groupListing.push(groupElement, seperator);
  });
  groupListing.push(boldGroups.slice(-1));
  const groupParagraph = React.createElement("p", null, boldName, " belongs to ", groupListing);

  return (
    <div>
      <h2>Profile</h2>
      <img src={pfp} data-testid="profile-picture" />
      <p>
        The username is {boldName}. See more details on the user on <b><a href={profileUrl}>SSO OAuth Provider.</a></b>
      </p>
      {groups && groupParagraph}
    </div>
  );
}

function SettingsTab() {
  const profileUrl = useAuth().user?.profile.profile;
  return (
    <div>
      <h2>Settings</h2>
      <p>Edit the profile on <b><a href={profileUrl}>SSO OAuth Provider.</a></b></p>
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
