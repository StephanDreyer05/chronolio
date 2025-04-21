import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    resetTimeline: () => initialState,
    setItems(state, action: PayloadAction<TimelineItem[]>) {
      state.past.push([...state.items]);
      state.items = action.payload;
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    addItem(state, action: PayloadAction<TimelineItem>) {
      state.past.push([...state.items]);
      state.items.push(action.payload);
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    updateItem(state, action: PayloadAction<{ id: string; updates: Partial<TimelineItem> }>) {
      state.past.push([...state.items]);
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload.updates };
      }
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    deleteItem(state, action: PayloadAction<string>) {
      state.past.push([...state.items]);
      state.items = state.items.filter(item => item.id !== action.payload);
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    moveItem(state, action: PayloadAction<{ dragIndex: number; hoverIndex: number }>) {
      state.past.push([...state.items]);
      const { dragIndex, hoverIndex } = action.payload;
      const dragItem = state.items[dragIndex];
      state.items.splice(dragIndex, 1);
      state.items.splice(hoverIndex, 0, dragItem);
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    sortItems(state) {
      state.past.push([...state.items]);
      state.items.sort((a, b) => a.startTime.localeCompare(b.startTime));
      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    updateWeddingInfo(state, action: PayloadAction<Partial<WeddingInfo>>) {
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
    undo(state) {
      if (state.past.length > 0) {
        const previous = state.past.pop()!;
        state.future.push([...state.items]);
        state.items = previous;
        state.canUndo = state.past.length > 0;
        state.canRedo = true;
      }
    },
    redo(state) {
      if (state.future.length > 0) {
        const next = state.future.pop()!;
        state.past.push([...state.items]);
        state.items = next;
        state.canUndo = true;
        state.canRedo = state.future.length > 0;
      }
    },
    setBulkEditMode(state, action: PayloadAction<boolean>) {
      state.bulkEditMode = action.payload;
      if (!action.payload) {
        state.selectedItems = [];
      }
    },
    toggleItemSelection(state, action: PayloadAction<string>) {
      const index = state.selectedItems.indexOf(action.payload);
      if (index === -1) {
        state.selectedItems.push(action.payload);
      } else {
        state.selectedItems.splice(index, 1);
      }
    },
    selectAllInCategory(state, action: PayloadAction<string>) {
      const categoryItems = state.items
        .filter(item => item.category === action.payload)
        .map(item => item.id);

      const newSet = new Set([...state.selectedItems]);
      categoryItems.forEach(id => newSet.add(id));
      state.selectedItems = Array.from(newSet);
    },
    clearSelection(state) {
      state.selectedItems = [];
    },
    adjustSelectedTimes(state, action: PayloadAction<{ minutes: number }>) {
      if (state.selectedItems.length === 0) return;

      state.past.push([...state.items]);
      state.items = state.items.map(item => {
        if (state.selectedItems.includes(item.id)) {
          // Calculate start time
          const [startHours, startMinutes] = item.startTime.split(':').map(Number);
          let startTotalMinutes = startHours * 60 + startMinutes + action.payload.minutes;

          // Handle day wrapping
          while (startTotalMinutes < 0) startTotalMinutes += 24 * 60;
          startTotalMinutes = startTotalMinutes % (24 * 60);

          const newStartHours = Math.floor(startTotalMinutes / 60);
          const newStartMinutes = startTotalMinutes % 60;
          const newStartTime = `${String(newStartHours).padStart(2, '0')}:${String(newStartMinutes).padStart(2, '0')}`;

          // Calculate new end time based on original duration (not changing duration)
          let newEndTime = item.endTime;
          
          if (item.duration) {
            // Get duration in minutes
            const [durationHours, durationMinutes] = item.duration.split(':').map(Number);
            const durationTotalMinutes = durationHours * 60 + durationMinutes;
            
            // Add duration to new start time
            let endTotalMinutes = startTotalMinutes + durationTotalMinutes;
            
            // Handle day wrapping
            endTotalMinutes = endTotalMinutes % (24 * 60);
            
            const newEndHours = Math.floor(endTotalMinutes / 60);
            const newEndMinutes = endTotalMinutes % 60;
            newEndTime = `${String(newEndHours).padStart(2, '0')}:${String(newEndMinutes).padStart(2, '0')}`;
          }

          return {
            ...item,
            startTime: newStartTime,
            endTime: newEndTime
            // Keep original duration (don't include in the return object to maintain it)
          };
        }
        return item;
      });

      state.future = [];
      state.canUndo = true;
      state.canRedo = false;
    },
    deleteSelectedItems(state) {
      if (state.selectedItems.length === 0) return;

      state.past.push([...state.items]);
      state.items = state.items.filter(item => !state.selectedItems.includes(item.id));
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

export type RootState = {
  timeline: TimelineState;
};

export default timelineSlice.reducer;