import { createSlice, PayloadAction, AnyAction } from '@reduxjs/toolkit';

interface TimelineItem {
  id: string;
  startTime: string;
  endTime: string;
  duration: string;
  title: string;
  description: string;
  location: string;
  type: string;
  category?: string;
  categoryId?: string;
  vendors?: any[];
}

interface WeddingInfo {
  names: string;
  date: string;
  type?: string;
  location?: string;
  customFieldValues?: Record<string, string | number | boolean | null>;
}

interface TimelineState {
  items: TimelineItem[];
  weddingInfo: WeddingInfo;
  past: TimelineItem[][];
  future: TimelineItem[][];
  canUndo: boolean;
  canRedo: boolean;
  selectedItems: string[];
  bulkEditMode: boolean;
}

const initialState: TimelineState = {
  items: [],
  weddingInfo: {
    names: '',
    date: new Date().toISOString().split('T')[0],
    type: undefined,
    location: undefined,
    customFieldValues: {}, // Initialize empty object
  },
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  selectedItems: [],
  bulkEditMode: false,
};

// Helper function to parse HH:MM time string to total minutes
const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
      console.error(`Invalid time format for parsing: ${timeStr}`);
      return 0; // Return 0 or handle error appropriately
  }
  return hours * 60 + minutes;
};

// Helper function to parse duration string (e.g., "60", "90m", "1h 30m") to minutes
const parseDuration = (durationStr: string): number => {
  if (!durationStr) return 0;

  // Try parsing as a plain number first (assumed minutes)
  const durationNum = parseInt(durationStr, 10);
  if (!isNaN(durationNum) && durationStr.match(/^\d+$/)) {
      return durationNum;
  }
    
  let totalMinutes = 0;
  const hourMatch = durationStr.match(/(\d+(\.\d+)?)\s*h/); // Allow float for hours
  const minMatch = durationStr.match(/(\d+)\s*m/);

  if (hourMatch) {
      totalMinutes += parseFloat(hourMatch[1]) * 60;
  }
  if (minMatch) {
      totalMinutes += parseInt(minMatch[1], 10);
  }
    
  // Fallback if no units were found but it could be parsed as a number earlier
  if (totalMinutes === 0 && !isNaN(durationNum)) {
     return durationNum;
  }

  if (totalMinutes === 0 && durationStr) {
    console.warn(`Could not parse duration: ${durationStr}. Assuming 0 minutes.`);
  }

  // Ensure we return an integer number of minutes
  return Math.round(totalMinutes);
};


// Helper function to format total minutes to HH:MM string
const formatTime = (totalMinutes: number): string => {
  totalMinutes = Math.round(totalMinutes) % (24 * 60); // Ensure integer and handle day wrap around
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // Handle negative wrap around
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    resetTimeline: (state: TimelineState) => initialState,
    setItems(state: TimelineState, action: PayloadAction<TimelineItem[]>) {
      state.past.push([...state.items]);
      state.items = action.payload;
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    addItem(state: TimelineState, action: PayloadAction<TimelineItem>) {
      state.past.push([...state.items]);
      state.items.push(action.payload);
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    updateItem(state: TimelineState, action: PayloadAction<{ id: string; updates: Partial<TimelineItem> }>) {
      state.past.push([...state.items]);
      const index = state.items.findIndex((item: TimelineItem) => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload.updates };
      }
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    deleteItem(state: TimelineState, action: PayloadAction<string>) {
      state.past.push([...state.items]);
      state.items = state.items.filter((item: TimelineItem) => item.id !== action.payload);
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    moveItem(state: TimelineState, action: PayloadAction<{ dragIndex: number; hoverIndex: number }>) {
      state.past.push([...state.items]);
      const { dragIndex, hoverIndex } = action.payload;
      const dragItem = state.items[dragIndex];
      state.items.splice(dragIndex, 1);
      state.items.splice(hoverIndex, 0, dragItem);
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    sortItems(state: TimelineState) {
      state.past.push([...state.items]);
      state.items.sort((a: TimelineItem, b: TimelineItem) => a.startTime.localeCompare(b.startTime));
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    updateWeddingInfo(state: TimelineState, action: PayloadAction<Partial<WeddingInfo>>) {
      if (action.payload.date) {
        const date = new Date(action.payload.date);
        if (!isNaN(date.getTime())) {
          state.weddingInfo = {
            ...state.weddingInfo,
            ...action.payload,
            date: action.payload.date
          };
        }
      } else {
        state.weddingInfo = { ...state.weddingInfo, ...action.payload };
      }
    },
    undo(state: TimelineState) {
      if (state.past.length > 0) {
        const previous = state.past.pop()!;
        state.future.push([...state.items]);
        state.items = previous;
        state.canUndo = state.past.length > 0;
        state.canRedo = true;
      }
    },
    redo(state: TimelineState) {
      if (state.future.length > 0) {
        const next = state.future.pop()!;
        state.past.push([...state.items]);
        state.items = next;
        state.canUndo = true;
        state.canRedo = state.future.length > 0;
      }
    },
    setBulkEditMode(state: TimelineState, action: PayloadAction<boolean>) {
      state.bulkEditMode = action.payload;
      if (!action.payload) {
        state.selectedItems = [];
      }
    },
    toggleItemSelection(state: TimelineState, action: PayloadAction<string>) {
      const index = state.selectedItems.indexOf(action.payload);
      if (index === -1) {
        state.selectedItems.push(action.payload);
      } else {
        state.selectedItems.splice(index, 1);
      }
    },
    selectAllInCategory(state: TimelineState, action: PayloadAction<string>) {
      const categoryItems = state.items
        .filter((item: TimelineItem) => item.category === action.payload)
        .map((item: TimelineItem) => item.id);

      const newSet = new Set([...state.selectedItems]);
      categoryItems.forEach(id => newSet.add(id));
      state.selectedItems = Array.from(newSet);
    },
    clearSelection(state: TimelineState) {
      state.selectedItems = [];
    },
    adjustSelectedTimes(state: TimelineState, action: PayloadAction<{ minutes: number }>) {
      if (state.selectedItems.length === 0) return;

      state.past.push([...state.items]);
      state.items = state.items.map((item: TimelineItem) => {
        if (state.selectedItems.includes(item.id)) {
          // Parse start time and duration
          const startMinutes = parseTime(item.startTime);
          const durationMinutes = parseDuration(item.duration); // Use helper

          // Calculate new start time in minutes
          let newStartMinutes = startMinutes + action.payload.minutes;

          // Calculate new end time in minutes
          const newEndMinutes = newStartMinutes + durationMinutes;

          // Format back to HH:MM strings
          const newStartTimeStr = formatTime(newStartMinutes);
          const newEndTimeStr = formatTime(newEndMinutes);

          return {
            ...item,
            startTime: newStartTimeStr,
            endTime: newEndTimeStr, // Update endTime
            // Duration remains unchanged conceptually, but endTime reflects the shift
          };
        }
        return item;
      });

      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    deleteSelectedItems(state: TimelineState) {
      if (state.selectedItems.length === 0) return;

      state.past.push([...state.items]);
      state.items = state.items.filter((item: TimelineItem) => !state.selectedItems.includes(item.id));
      state.selectedItems = [];
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    }
  },
});

export const {
  resetTimeline,
  setItems,
  addItem,
  updateItem,
  deleteItem,
  moveItem,
  sortItems,
  updateWeddingInfo,
  undo,
  redo,
  setBulkEditMode,
  toggleItemSelection,
  selectAllInCategory,
  clearSelection,
  adjustSelectedTimes,
  deleteSelectedItems,
} = timelineSlice.actions;

export type RootState = ReturnType<typeof timelineSlice.reducer>;

export default timelineSlice.reducer;