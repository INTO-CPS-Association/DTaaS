/**
 * The part of the client store that belongs to the extensions: the slice of
 * each extension at `state.ext.<id>`.
 */

import { combineReducers, type Reducer } from 'redux';
import type { ExtensionReducer } from '@into-cps-association/dtaas-sdk';

type ExtensionSlices = Record<string, unknown>;

/** One reducer for every extension slice, or an empty object without any. */
export default function extensionState(
  reducers: Readonly<Record<string, ExtensionReducer<unknown>>>,
): Reducer<ExtensionSlices> {
  if (Object.keys(reducers).length === 0) {
    // combineReducers warns about an empty map, so state stays an empty object.
    return (state: ExtensionSlices = {}) => state;
  }
  return combineReducers(reducers);
}
