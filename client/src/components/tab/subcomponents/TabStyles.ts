import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import styled from 'styled-components';

const StyledTabs = styled(Tabs)`
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const StyledTabList = styled(TabList)`
  border-bottom: 1px solid #aaa;
  margin: 0 0 10px;
  padding: 0;
`;

const StyledTab = styled(Tab)`
  display: inline-block;
  border: 1px solid transparent;
  border-bottom: none;
  bottom: -1px;
  position: relative;
  list-style: none;
  padding: 6px 12px;
  cursor: pointer;
  &:focus {
    outline: none;
  }
  &:focus::after {
    content: '';
    position: absolute;
    height: 5px;
    left: -4px;
    right: -4px;
    bottom: -5px;
    background: #fff;
  }
  &.react-tabs__tab--selected {
    background: #fff;
    border-color: #aaa;
    color: black;
    border-radius: 5px 5px 0 0;
  }
  &.react-tabs__tab--disabled {
    color: GrayText;
    cursor: default;
  }
`;

const StyledTabPanel = styled(TabPanel)`
  display: none;
  &.react-tabs__tab-panel--selected {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }
`;

export {
  StyledTab as Tab,
  StyledTabList as TabList,
  StyledTabPanel as TabPanel,
  StyledTabs as Tabs,
};
