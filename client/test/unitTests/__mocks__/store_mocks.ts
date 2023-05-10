// Will mock all store access files. Issues is that all mocks
// will be the same. Need to find a way to mock each file
// individually.

// It is not easy / possible to override the mock for a single test.
// See envUtil.test.ts for an example of how to mock a single function

// jest.mock('store/AppAccess', () => ({
//   default: () => jest.fn(),
// }));

// jest.mock('store/CartAccess', () => ({
//   default: () => jest.fn(),
// }));

// jest.mock('store/UserAccess', () => ({
//   default: () => jest.fn(),
// }));

// Something like this worked before, but now it doesn't
// jest.mock('store/UserAccess', () => ({
//     default: () => ({
//       state: {
//         userName: 'testUsername',
//       },
//     }),
//   }));

// Fuck it, lets just use the redux store initstate wrap function I made.
