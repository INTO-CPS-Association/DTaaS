import * as React from 'react';
import ScenarioAnalysis from 'route/scenarioAnalysis/ScenarioAnalysis';
import tabs from 'route/scenarioAnalysis/ScenarioAnalysisTabData';
import { InitRouteTests, itDisplaysContentOfTabs } from '../testUtils';

describe('ScenarioAnalysis', () => {
  InitRouteTests(<ScenarioAnalysis />);

  itDisplaysContentOfTabs(tabs);
});
