// Host services
export { default as fakeHostServices } from './fakeHostServices';
export type {
  FakeHostOptions,
  FakeHostServices,
  Recorded,
} from './fakeHostServices';
export { default as createFakeSignals } from './fakeSignals';
export type { FakeSignals, FakeSignalsOptions } from './fakeSignals';
export type { FakePlayhead } from './fakePlayhead';
export type { FakeConnection } from './fakeConnection';
export { default as createFakeViz } from './fakeViz';
export type { FakeVizOptions, RecordedSave } from './fakeViz';
export { default as createMemoryContents } from './memoryContents';
export type { MemoryContents } from './memoryContents';
export { default as createMemoryGit } from './memoryGit';
export type {
  GitRecord,
  RecordedCommit,
  RecordedMergeRequest,
} from './memoryGit';

// Rendering and replay
export { default as renderWithHost } from './renderWithHost';
export type { RenderWithHostOptions } from './renderWithHost';
export { default as replayFixture } from './replayFixture';
export type { ReplayFrame, ReplayOptions } from './replayFixture';

// Conformance
export { default as checkConformance } from './checkConformance';
export type { ConformanceOptions, ConformanceReport } from './checkConformance';
export {
  default as installSocketGuard,
  SocketBlockedError,
} from './socketGuard';
export type { SocketGuard } from './socketGuard';
