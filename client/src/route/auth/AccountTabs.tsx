import * as React from 'react';
import TabComponent from 'components/tab/TabComponent';
import { useAuth } from 'react-oidc-context';
import { TabData } from 'components/tab/subcomponents/TabRender';

function AccountTabs() {
  const {user} = useAuth();
  const name=user?.profile.preferred_username;
  const pfp=user?.profile.picture;
  const profileUrl=user?.profile.profile;
  const groupsLength = ((user?.profile.groups_direct as string[] | undefined)?.length ?? 0);
  const accountTab: TabData[] = [
    {
      label: 'Profile',
      body: (
        <>
          <div>
            <h2>Profile</h2>
            <img src={pfp} data-testid="profile-picture" />
            <p>
              The username is <b>{name}</b>. See more details on the user on <b><a href={profileUrl}>SSO OAuth Provider.</a></b>                                                     
            </p>
            <p>
              {groupsLength===1 && <p>{name} belongs to {groupsLength} group.</p>}
              {groupsLength>1 && <p>{name} belongs to {groupsLength} groups.</p>}
            </p>
          </div>
        </>
      ),
    },
    {
      label: 'Settings',
      body: (
        <>
          <div>
            <h2>Settings</h2>
            <p>Edit the profile on <b><a href={profileUrl}>SSO OAuth Provider.</a></b></p>
          </div>
        </>
      ),
    },
  ];

  const scope: TabData[][] = [];

  return <TabComponent assetType={accountTab} scope={scope} />;
}

export default AccountTabs;
