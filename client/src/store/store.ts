import { configureStore } from '@reduxjs/toolkit';
import timelineReducer from './timelineSlice';
import settingsReducer from './settingsSlice';

export const store = configureStore({
  reducer: {
    timeline: timelineReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;