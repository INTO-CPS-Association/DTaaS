import { ITabs } from 'route/IData';

export const tabs1: ITabs[] = [
  {
    label: 'Functions',
    body: `The functions responsible for pre- and post-processing of: data inputs, data outputs, control outputs. The data science libraries and functions can be used to create useful function assets for the platform.
    In some cases, Digital Twin models require calibration prior to their use; functions written by domain experts along with right data inputs can make model calibration an achievable goal. Another use of functions is to process the sensor and actuator data of both Physical Twins and Digital Twins.`,
  },
  {
    label: 'Models',
    body: `The model assets are used to describe different aspects of Physical Twins and their environment, at different levels of abstraction. Therefore, it is possible to have multiple models for the same Physical Twin. For example, a flexible robot used in a car production plant may have structural model(s) which will be useful in tracking the wear and tear of parts. The same robot can have a behavioural model(s) describing the safety guarantees provided by the robot manufacturer. The same robot can also have a functional model(s) describing the part manufacturing capabilities of the robot.`,
  },
  {
    label: 'Tools',
    body: `The software tool assets are software used to create, evaluate and analyze models. These tools are executed on top of a computing platforms, i.e., an operating system, or virtual machines like Java virtual machine, or inside docker containers. The tools tend to be platform specific, making them less reusable than models.
    A tool can be packaged to run on a local or distributed virtual machine environments thus allowing selection of most suitable execution environment for a Digital Twin.
    Most models require tools to evaluate them in the context of data inputs.
    There exist cases where executable packages are run as binaries in a computing environment. Each of these packages are a pre-packaged combination of models and tools put together to create a ready to use Digital Twins.`,
  },
  {
    label: 'Data',
    body: `The data sources and sinks available to a digital twins. Typical examples of data sources are sensor measurements from Physical Twins, and test data provided by manufacturers for calibration of models. Typical examples of data sinks are visualization software, external users and data storage services. There exist special outputs such as events, and commands which are akin to control outputs from a Digital Twin. These control outputs usually go to Physical Twins, but they can also go to another Digital Twin.`,
  },
  {
    label: 'Digital Twins',
    body: `These are ready to use digital twins created by one or more users. These digital twins can be reconfigured later for specific use cases.`,
  },
];

// This type of Array Tabs is for the second line of Tabs
export const tabs2: ITabs[] = [
    {
      label: '.',
      body: ``,
    },
    {
      label: 'Private',
      body: `This is the PRIVATE TAB`,
    },
    {
      label: 'Common',
      body: `This is the COMMON TAB`,
    },
  ];
