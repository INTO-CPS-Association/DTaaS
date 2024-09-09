import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import DigitalTwin from 'util/gitlabDigitalTwin';

interface DigitalTwinState {
  [key: string]: DigitalTwin;
}

const initialState: DigitalTwinState = {};

const digitalTwinSlice = createSlice({
  name: 'digitalTwin',
  initialState,
  reducers: {
    setDigitalTwin: (
      state,
      action: PayloadAction<{ assetName: string; digitalTwin: DigitalTwin }>,
    ) => {
      state[action.payload.assetName] = action.payload.digitalTwin;
    },
  },
});

export const { setDigitalTwin } = digitalTwinSlice.actions;
export default digitalTwinSlice.reducer;
