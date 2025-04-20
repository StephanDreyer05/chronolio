import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchWithAuth } from '../lib/api';

interface EventType {
  type: string;
  color: string;
  customFields?: Array<{
    id: string;
    name: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
    required: boolean;
    defaultValue?: string | number | boolean | null;
    order?: number;
  }>;
}

interface ContactType {
  id: number;
  name: string;
  customFields?: Array<{
    id: string;
    name: string;
    type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'link';
    required: boolean;
    defaultValue?: string | number | boolean | null;
    order?: number;
  }>;
  last_modified?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  hidePastEvents: boolean;
  showCategories: boolean;
  defaultEventDuration: number;
  defaultStartTime: string;
  timeIncrement: number;
  durationIncrement: number;
  eventTypes: EventType[];
  contactTypes: ContactType[];
  defaultCalendarView: 'month' | 'quarter' | 'year';
  defaultSorting: 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'type-asc' | 'type-desc' | 'location-asc' | 'location-desc';
  defaultTimelineViewType: 'list' | 'calendar' | 'table';
  exportFooterText: string;
  isLoading: boolean;
  error: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const initialState: SettingsState = {
  theme: 'light',
  hidePastEvents: false,
  showCategories: true,
  defaultEventDuration: 30,
  defaultStartTime: '09:00',
  timeIncrement: 5,
  durationIncrement: 5,
  defaultCalendarView: 'quarter',
  defaultSorting: 'date-asc',
  defaultTimelineViewType: 'list',
  exportFooterText: 'Created with Chronolio.com',
  eventTypes: [
    { type: 'Wedding', color: '#6d28d9' },
    { type: 'Function', color: '#14B8A6' },    
    { type: 'Party', color: '#db2777' },
    { type: 'Conference', color: '#059669' },
    { type: 'Corporate', color: '#2563eb' },
    { type: 'Festival', color: '#d97706' },
    { type: 'Workshop', color: '#d97706' },
    { type: 'Other', color: '#6b7280' }
  ],
  contactTypes: [],
  isLoading: true,
  error: null
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload, isLoading: false };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const { setSettings, setLoading, setError } = settingsSlice.actions;

// Add a variable to track the last fetch time
let lastFetchTime = 0;
const FETCH_COOLDOWN = 2000; // 2 seconds cooldown between fetches

// Helper function to safely convert a value to an ISO date string
const safeISODate = (value: any): string | undefined => {
  if (!value) return undefined;
  
  try {
    return new Date(value).toISOString();
  } catch (error) {
    console.error('Invalid date value:', value);
    return undefined;
  }
};

// Helper function to sanitize an object to ensure it doesn't have any properties that could cause date issues
const sanitizeObject = (obj: any): any => {
  if (!obj) return obj;
  
  // Return a primitive value as is
  if (typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Clone the object to avoid modifying the original
  const result: any = {};
  
  // Copy only safe properties
  for (const [key, value] of Object.entries(obj)) {
    // Skip properties that might cause issues
    if (key === 'isEditing') continue;
    
    // Sanitize date fields
    if (key === 'createdAt' || key === 'updatedAt' || key === 'last_modified') {
      if (value) {
        result[key] = safeISODate(value);
      }
      continue;
    }
    
    // Recursively sanitize objects and arrays
    if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
};

// Thunk for fetching settings
export const fetchSettings = () => async (dispatch: any) => {
  try {
    // Check if we should skip this fetch due to a recent fetch
    const now = Date.now();
    if (now - lastFetchTime < FETCH_COOLDOWN) {
      console.log('Skipping fetchSettings due to cooldown period');
      return;
    }
    
    // Update the last fetch time
    lastFetchTime = now;
    
    console.log('Starting fetchSettings...');
    dispatch(setLoading(true));
    
    const response = await fetchWithAuth('/api/settings');
    console.log('Settings API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch settings: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
    }
    
    const settings = await response.json();
    console.log('Settings retrieved from server (raw):', JSON.stringify(settings));
    
    // Then set the new settings from the server with proper normalization
    const normalizedSettings = {
      ...settings,
      theme: settings.theme || initialState.theme,
      hidePastEvents: settings.hidePastEvents ?? initialState.hidePastEvents,
      showCategories: settings.showCategories ?? initialState.showCategories,
      defaultEventDuration: settings.defaultEventDuration || initialState.defaultEventDuration,
      defaultStartTime: settings.defaultStartTime || initialState.defaultStartTime,
      timeIncrement: settings.timeIncrement || initialState.timeIncrement,
      durationIncrement: settings.durationIncrement || initialState.durationIncrement,
      defaultCalendarView: settings.defaultCalendarView || initialState.defaultCalendarView,
      defaultSorting: settings.defaultSorting || initialState.defaultSorting,
      defaultTimelineViewType: settings.defaultTimelineViewType || initialState.defaultTimelineViewType,
      eventTypes: Array.isArray(settings.eventTypes) ? settings.eventTypes : initialState.eventTypes,
      contactTypes: Array.isArray(settings.vendorTypes) ? settings.vendorTypes : [], // Map vendorTypes to contactTypes
      exportFooterText: settings.exportFooterText || initialState.exportFooterText,
      isLoading: false
    };
    
    console.log('Normalized settings to be applied:', JSON.stringify(normalizedSettings));
    dispatch(setSettings(normalizedSettings));
    console.log('Settings updated in Redux store successfully');
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Use more specific error message for debugging
    const errorMessage = error instanceof Error 
      ? `Failed to fetch settings: ${error.message}` 
      : 'Failed to fetch settings: Unknown error';
    
    dispatch(setError(errorMessage));
    
    // Don't set default settings on error - this causes issues
    // Keep the store in an error state so the UI can handle it
  }
};

// Thunk for updating settings
export const updateSettingsApi = (settings: Partial<SettingsState>) => async (dispatch: any) => {
  try {
    dispatch(setLoading(true));
    
    // Create a minimal sanitized version of settings to send to the server
    const minimalSettings = {
      theme: settings.theme,
      hidePastEvents: settings.hidePastEvents,
      showCategories: settings.showCategories,
      defaultEventDuration: settings.defaultEventDuration,
      defaultStartTime: settings.defaultStartTime,
      timeIncrement: settings.timeIncrement,
      durationIncrement: settings.durationIncrement,
      defaultCalendarView: settings.defaultCalendarView,
      defaultSorting: settings.defaultSorting,
      defaultTimelineViewType: settings.defaultTimelineViewType,
      exportFooterText: settings.exportFooterText || '',
      eventTypes: settings.eventTypes 
        ? sanitizeObject(settings.eventTypes.map(type => ({
            type: type.type,
            color: type.color,
            customFields: type.customFields ? type.customFields.map(field => ({
              id: field.id,
              name: field.name,
              type: field.type,
              required: !!field.required,
              defaultValue: field.defaultValue ?? null,
              order: typeof field.order === 'number' ? field.order : 0
            })) : []
          })))
        : [],
      vendorTypes: settings.contactTypes 
        ? sanitizeObject(settings.contactTypes.map(type => ({
            id: type.id,
            name: type.name,
            customFields: type.customFields ? type.customFields.map(field => ({
              id: field.id,
              name: field.name,
              type: field.type,
              required: !!field.required,
              defaultValue: field.defaultValue ?? null,
              order: typeof field.order === 'number' ? field.order : 0
            })) : []
          })))
        : []
    };

    console.log('Sending sanitized settings to server:', minimalSettings);

    const response = await fetchWithAuth('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalSettings),
    });

    if (!response.ok) {
      throw new Error('Failed to update settings');
    }

    const updatedSettings = await response.json();
    // Convert vendorTypes to contactTypes
    dispatch(setSettings({
      ...updatedSettings,
      contactTypes: updatedSettings.vendorTypes || []
    }));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to update settings'));
  }
};

// Thunk for resetting settings
export const resetSettingsApi = () => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  try {
    dispatch(setLoading(true));

    // Get current settings to preserve event types and contact types
    const currentSettings = getState().settings;

    // Create a new settings object with default values but preserve event types and contact types
    const resetSettings = {
      ...initialState,
      eventTypes: currentSettings.eventTypes,
      contactTypes: currentSettings.contactTypes,
      defaultTimelineViewType: initialState.defaultTimelineViewType,
      isLoading: false,
      error: null
    };

    // Update settings with the reset values but map contactTypes to vendorTypes for API compatibility
    const response = await fetchWithAuth('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...resetSettings,
        vendorTypes: resetSettings.contactTypes,
        defaultTimelineViewType: resetSettings.defaultTimelineViewType
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to reset settings');
    }

    // Set the reset settings in the store
    dispatch(setSettings(resetSettings));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to reset settings'));
  }
};

// Event type management thunks
export const addEventTypeApi = (eventType: EventType) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  const state = getState();
  const updatedEventTypes = [...state.settings.eventTypes, eventType];
  return dispatch(updateSettingsApi({ eventTypes: updatedEventTypes }));
};

export const removeEventTypeApi = (type: string) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  const state = getState();
  const updatedEventTypes = state.settings.eventTypes.filter(et => et.type !== type);
  return dispatch(updateSettingsApi({ eventTypes: updatedEventTypes }));
};

export const updateEventTypeColorApi = (type: string, color: string) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  const state = getState();
  const updatedEventTypes = state.settings.eventTypes.map(et =>
    et.type === type ? { ...et, color } : et
  );
  return dispatch(updateSettingsApi({ eventTypes: updatedEventTypes }));
};

export const updateEventTypeNameApi = (oldType: string, newType: string) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  const state = getState();
  const updatedEventTypes = state.settings.eventTypes.map(et =>
    et.type === oldType ? { ...et, type: newType } : et
  );
  return dispatch(updateSettingsApi({ eventTypes: updatedEventTypes }));
};

export const updateEventTypeCustomFieldsApi = (type: string, customFields: EventType['customFields']) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  const state = getState();
  const updatedEventTypes = state.settings.eventTypes.map(et =>
    et.type === type ? { ...et, customFields } : et
  );
  return dispatch(updateSettingsApi({ eventTypes: updatedEventTypes }));
};

// Add thunk for reordering event type custom fields
export const reorderEventTypeCustomFieldsApi = (type: string, customFields: EventType['customFields']) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  try {
    const response = await fetchWithAuth(`/api/event-types/${encodeURIComponent(type)}/custom-fields/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customFields }),
    });

    if (!response.ok) {
      throw new Error('Failed to reorder event type custom fields');
    }

    const updatedEventType = await response.json();
    
    const state = getState();
    const updatedEventTypes = state.settings.eventTypes.map(et =>
      et.type === type ? updatedEventType : et
    );

    dispatch(setSettings({ ...state.settings, eventTypes: updatedEventTypes }));
  } catch (error) {
    console.error('Reordering error:', error);
    dispatch(setError(error instanceof Error ? error.message : 'Failed to reorder event type custom fields'));
    throw error;
  }
};

// Contact type management thunks
export const addVendorTypeApi = (name: string) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  try {
    const response = await fetchWithAuth('/api/vendor-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Failed to add contact type');
    }

    const newContactType = await response.json();
    const state = getState();
    const updatedContactTypes = [...state.settings.contactTypes, newContactType];

    dispatch(setSettings({ ...state.settings, contactTypes: updatedContactTypes }));
    return newContactType;
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to add contact type'));
    throw error;
  }
};

export const removeVendorTypeApi = (id: number) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  try {
    const response = await fetchWithAuth(`/api/vendor-types/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove contact type');
    }

    const state = getState();
    const updatedContactTypes = state.settings.contactTypes.filter(vt => vt.id !== id);

    dispatch(setSettings({ ...state.settings, contactTypes: updatedContactTypes }));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to remove contact type'));
    throw error;
  }
};

export const updateVendorTypeNameApi = (id: number, name: string) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  try {
    const response = await fetchWithAuth(`/api/vendor-types/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Failed to update contact type name');
    }

    const updatedContactType = await response.json();
    const state = getState();
    const updatedContactTypes = state.settings.contactTypes.map(vt =>
      vt.id === id ? updatedContactType : vt
    );

    dispatch(setSettings({ ...state.settings, contactTypes: updatedContactTypes }));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to update contact type name'));
    throw error;
  }
};

// Add new thunk for managing contact type custom fields
export const updateVendorTypeCustomFieldsApi = (id: number, customFields: ContactType['customFields']) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  try {
    const response = await fetchWithAuth(`/api/vendor-types/${id}/custom-fields`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customFields }),
    });

    if (!response.ok) {
      throw new Error('Failed to update contact type custom fields');
    }

    const updatedContactType = await response.json();
    const state = getState();
    const updatedContactTypes = state.settings.contactTypes.map(vt =>
      vt.id === id ? updatedContactType : vt
    );

    dispatch(setSettings({ ...state.settings, contactTypes: updatedContactTypes }));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to update contact type custom fields'));
    throw error;
  }
};

// Add thunk for reordering contact type custom fields
export const reorderVendorTypeCustomFieldsApi = (id: number, customFields: ContactType['customFields']) => async (dispatch: any, getState: () => { settings: SettingsState }) => {
  try {
    const response = await fetchWithAuth(`/api/vendor-types/${id}/custom-fields/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customFields }),
    });

    if (!response.ok) {
      throw new Error('Failed to reorder contact type custom fields');
    }

    const updatedContactType = await response.json();
    
    const state = getState();
    const updatedContactTypes = state.settings.contactTypes.map(vt =>
      vt.id === id ? updatedContactType : vt
    );

    dispatch(setSettings({ ...state.settings, contactTypes: updatedContactTypes }));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to reorder contact type custom fields'));
    throw error;
  }
};

export type RootState = {
  settings: SettingsState;
};

export default settingsSlice.reducer;