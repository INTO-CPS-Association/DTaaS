import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { z } from 'zod';
import * as servicesTemplate from 'utils/services.json';

const WorkbenchServiceSchema = z.object({
  name: z.string(),
  description: z.string(),
  endpoint: z.string(),
});

const WorkbenchServicesSchema = z.record(z.string(), WorkbenchServiceSchema);

export type WorkbenchService = z.infer<typeof WorkbenchServiceSchema>;

export interface WorkbenchServicesState {
  services: Record<string, WorkbenchService>;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: WorkbenchServicesState = {
  services: {},
  status: 'idle',
};

function getFallbackServices(
  username: string,
): Record<string, WorkbenchService> {
  const fallback = JSON.parse(JSON.stringify(servicesTemplate)) as Record<
    string,
    WorkbenchService
  >;
  if (fallback.desktop) {
    fallback.desktop.endpoint = fallback.desktop.endpoint.replace(
      'username',
      username,
    );
  }
  return fallback;
}

export const fetchWorkbenchServices = createAsyncThunk(
  'workbench/fetchServices',
  async ({ url, username }: { url: string; username: string }) => {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }
      const data: unknown = await response.json();
      return WorkbenchServicesSchema.parse(data);
    } catch {
      return getFallbackServices(username);
    }
  },
);

const workbenchSlice = createSlice({
  name: 'workbench',
  initialState,
  reducers: {
    setWorkbenchServices: (state, action) => {
      state.services = action.payload as Record<string, WorkbenchService>;
      state.status = 'succeeded';
    },
    resetWorkbench: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkbenchServices.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWorkbenchServices.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.services = action.payload;
      })
      .addCase(fetchWorkbenchServices.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export const { setWorkbenchServices, resetWorkbench } = workbenchSlice.actions;
export default workbenchSlice.reducer;
