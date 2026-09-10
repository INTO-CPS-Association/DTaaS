import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import styled from 'styled-components';
import { brand, grey, minTouchTarget, radius, white } from 'theme/tokens';

/**
 * The library and digital twin tabs.
 *
 * These come from `react-tabs`, not from MUI, so they are outside the MUI
 * theme and cannot inherit from it. They read the same tokens directly, which
 * is what keeps them from drifting into a second visual language on the page.
 *
 * The old style drew each tab as a folder tab with a border on three sides and
 * a one pixel offset to overlap the strip below. It also removed the focus
 * outline and painted a white rectangle over the gap to hide it, which left a
 * keyboard user with nothing to follow.
 */
const StyledTabs = styled(Tabs)`
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-width: 0;
  width: 100%;
`;

const StyledTabList = styled(TabList)`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  border-bottom: 1px solid ${grey[200]};
  margin: 0 0 16px;
  padding: 0;
`;

const StyledTab = styled(Tab)`
  display: inline-flex;
  align-items: center;
  min-height: ${minTouchTarget}px;
  padding: 0 12px;
  position: relative;
  bottom: -1px;
  list-style: none;
  cursor: pointer;
  color: ${grey[600]};
  font-weight: 600;
  font-size: 0.875rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;

  &:hover {
    color: ${grey[900]};
  }

  /* The theme draws one focus ring for the whole application. This keeps it
     visible here instead of removing the outline the way the old style did. */
  &:focus-visible {
    outline: 2px solid ${brand.primary};
    outline-offset: -2px;
    border-radius: ${radius}px;
  }

  &.react-tabs__tab--selected {
    color: ${brand.primary};
    border-bottom-color: ${brand.primary};
  }

  &.react-tabs__tab--disabled {
    color: ${grey[400]};
    cursor: default;
  }
`;

/**
 * The second level of tabs, as a segmented control.
 *
 * The library page stacks two rows of tabs: the asset type on top and the
 * scope below. Drawn the same way, the two rows read as one broken navigation,
 * and nothing says which one is inside the other.
 *
 * So the two levels differ in kind, not in size. The row above stays a set of
 * labels with an underline, which is what a tab is. This row is a segmented
 * control, which is what a filter is: a small enclosed group where the current
 * choice is the raised one.
 */
const StyledScopeTabList = styled(TabList)`
  display: inline-flex;
  gap: 2px;
  width: fit-content;
  padding: 3px;
  margin: 0 0 16px;
  background-color: ${grey[100]};
  border: 1px solid ${grey[200]};
  border-radius: ${radius}px;
`;

const StyledScopeTab = styled(Tab)`
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;

  @media (pointer: coarse) {
    min-height: ${minTouchTarget}px;
  }

  list-style: none;
  cursor: pointer;
  color: ${grey[600]};
  font-weight: 600;
  font-size: 0.8125rem;
  border: none;
  border-radius: ${radius - 2}px;
  background: none;

  &:hover {
    color: ${grey[900]};
  }

  &:focus-visible {
    outline: 2px solid ${brand.primary};
    outline-offset: 1px;
  }

  &.react-tabs__tab--selected {
    color: ${grey[900]};
    background-color: ${white};
    box-shadow: 0 1px 2px 0 ${grey[300]};
  }

  &.react-tabs__tab--disabled {
    color: ${grey[400]};
    cursor: default;
    background: none;
    box-shadow: none;
  }
`;

const StyledTabPanel = styled(TabPanel)`
  display: none;
  &.react-tabs__tab-panel--selected {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-width: 0;
    width: 100%;
  }
`;

export {
  StyledTab as Tab,
  StyledTabList as TabList,
  StyledScopeTab as ScopeTab,
  StyledScopeTabList as ScopeTabList,
  StyledTabPanel as TabPanel,
  StyledTabs as Tabs,
};
