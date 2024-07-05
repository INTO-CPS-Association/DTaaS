import * as React from 'react';
import { createStore } from 'redux';
import { screen, within } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import LayoutPublic from 'page/LayoutPublic';
import Library from '../../src/route/library/Library';
import authReducer from '../../src/store/auth.slice';
import { renderWithRouter } from '../unitTests/testUtils';

jest.mock('react-oidc-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('../../src/util/auth/Authentication', () => ({
  getAndSetUsername: jest.fn(),
}));

const store = createStore(authReducer);

type AuthState = {
  isAuthenticated: boolean;
};

const setupTest = (authState: AuthState) => {
  const userMock = {
    profile: {
      profile: 'example/username',
    },
    access_token: 'example_token',
  };

  (useAuth as jest.Mock).mockReturnValue({ ...authState, user: userMock });

  if (authState.isAuthenticated) {
    store.dispatch({
      type: 'auth/setUserName',
      payload: userMock.profile.profile.split('/')[1],
    });
  } else {
    store.dispatch({ type: 'auth/setUserName', payload: undefined });
  }

  renderWithRouter(
    <LayoutPublic>
      <Library />
    </LayoutPublic>,
    { route: '/private', store },
  );
};

describe('Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Library content correctly', () => {
    setupTest({
      isAuthenticated: true,
    });

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const tablists = screen.getAllByRole('tablist');
    expect(tablists).toHaveLength(2);

    const assetTypeTablist = tablists[0];

    const assetTypesTabs = within(assetTypeTablist).getAllByRole('tab');
    expect(assetTypesTabs).toHaveLength(5);

    const functionsTab = within(assetTypeTablist).getByRole('tab', { name: "Functions", selected: true });
    expect(functionsTab).toBeInTheDocument();
    const modelsTab = within(assetTypeTablist).getByRole('tab', { name: "Models", selected: false });
    expect(modelsTab).toBeInTheDocument();
    const toolsTab = within(assetTypeTablist).getByRole('tab', { name: "Tools", selected: false });
    expect(toolsTab).toBeInTheDocument();
    const dataTab = within(assetTypeTablist).getByRole('tab', { name: "Data", selected: false });
    expect(dataTab).toBeInTheDocument();
    const digitalTwinsTab = within(assetTypeTablist).getByRole('tab', { name: "Digital Twins", selected: false });
    expect(digitalTwinsTab).toBeInTheDocument();

    const tablistsDiv = assetTypeTablist.closest('div');
    expect(tablistsDiv).toBeInTheDocument();

    const functionsParagraph = screen.getByText(/The functions responsible for pre- and post-processing of: data inputs, data outputs, control outputs. The data science libraries and functions can be used to create useful function assets for the platform. In some cases, Digital Twin models require calibration prior to their use; functions written by domain experts along with right data inputs can make model calibration an achievable goal. Another use of functions is to process the sensor and actuator data of both Physical Twins and Digital Twins./i);
    expect(functionsParagraph).toBeInTheDocument();
    const modelsParagraph = screen.queryByText(/The model assets are used to describe different aspects of Physical Twins and their environment, at different levels of abstraction. Therefore, it is possible to have multiple models for the same Physical Twin. For example, a flexible robot used in a car production plant may have structural model(s) which will be useful in tracking the wear and tear of parts. The same robot can have a behavioural model(s) describing the safety guarantees provided by the robot manufacturer. The same robot can also have a functional model(s) describing the part manufacturing capabilities of the robot./i);
    expect(modelsParagraph).not.toBeInTheDocument();
    const toolsParagraph = screen.queryByText(/The software tool assets are software used to create, evaluate and analyze models. These tools are executed on top of a computing platforms, i.e., an operating system, or virtual machines like Java virtual machine, or inside docker containers. The tools tend to be platform specific, making them less reusable than models. A tool can be packaged to run on a local or distributed virtual machine environments thus allowing selection of most suitable execution environment for a Digital Twin. Most models require tools to evaluate them in the context of data inputs. There exist cases where executable packages are run as binaries in a computing environment. Each of these packages are a pre-packaged combination of models and tools put together to create a ready to use Digital Twins./i);
    expect(toolsParagraph).not.toBeInTheDocument();
    const dataParagraph = screen.queryByText(/The data sources and sinks available to a digital twins. Typical examples of data sources are sensor measurements from Physical Twins, and test data provided by manufacturers for calibration of models. Typical examples of data sinks are visualization software, external users and data storage services. There exist special outputs such as events, and commands which are akin to control outputs from a Digital Twin. These control outputs usually go to Physical Twins, but they can also go to another Digital Twin./i);
    expect(dataParagraph).not.toBeInTheDocument();
    const digitalTwinsParagraph = screen.queryByText(/These are ready to use digital twins created by one or more users. These digital twins can be reconfigured later for specific use cases./i);
    expect(digitalTwinsParagraph).not.toBeInTheDocument();

    const scopeTablist = tablists[1];

    const scopeTabs = within(scopeTablist).getAllByRole('tab');
    expect(scopeTabs).toHaveLength(2);

    const privateTab = within(scopeTablist).getByRole('tab', { name: "Private", selected: true });
    expect(privateTab).toBeInTheDocument();
    const commonTab = within(scopeTablist).getByRole('tab', { name: "Common", selected: false });
    expect(commonTab).toBeInTheDocument();

    const privateParagraph = screen.getByText(/These reusable assets are only visible to you. Other users can not use these assets in their digital twins./i);
    expect(privateParagraph).toBeInTheDocument();

    // These reusable assets are only visible to all users. 
    const commonParagraph = screen.queryByText(/These reusable assets are only visible to all users. Other users can use these assets in their digital twins./i);
    expect(commonParagraph).not.toBeInTheDocument();

    const iframe = screen.getByTitle("Functions");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveProperty('src', 'https://example.com/URL_LIBtree/functions')

    const footer = screen.getByTestId('footer');
    expect(footer).toBeInTheDocument();
  });
});
