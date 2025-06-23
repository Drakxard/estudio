import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Exercise, Settings, Response } from '@shared/schema';

interface TimerState {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  isPomodoro: boolean;
}

interface AppState {
  // Current state
  currentSectionId: number;
  currentExerciseIndex: number;
  exercises: Exercise[];
  currentExercise: Exercise | null;
  currentResponse: string;
  responses: Record<number, string>; // exerciseId -> response
  
  // Timer
  timer: TimerState;
  
  // Settings
  settings: Settings | null;
  
  // UI state
  isSettingsOpen: boolean;
  isLoading: boolean;
  autoSaveStatus: 'saved' | 'saving' | 'error';
  showFeedbackDialog: boolean;
  
  // Actions
  setExercises: (exercises: Exercise[]) => void;
  setCurrentSection: (sectionId: number) => void;
  setCurrentExercise: (index: number) => void;
  setCurrentResponse: (response: string) => void;
  saveResponse: (exerciseId: number, response: string) => void;
  loadResponse: (exerciseId: number) => string;
  nextExercise: () => void;
  previousExercise: () => void;
  
  // Timer actions
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (minutes?: number) => void;
  updateTimer: () => void;
  
  // Settings actions
  setSettings: (settings: Settings) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  toggleSettings: () => void;
  
  // Auto-save
  setAutoSaveStatus: (status: 'saved' | 'saving' | 'error') => void;
  
  // Feedback
  setShowFeedbackDialog: (show: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSectionId: 1,
      currentExerciseIndex: 0,
      exercises: [],
      currentExercise: null,
      currentResponse: '',
      responses: {},
      
      timer: {
        minutes: 25,
        seconds: 0,
        isRunning: false,
        isPomodoro: true,
      },
      
      settings: null,
      
      isSettingsOpen: false,
      isLoading: false,
      autoSaveStatus: 'saved',
      showFeedbackDialog: false,
      
      // Actions
      setExercises: (exercises) => {
        set({ exercises });
        const state = get();
        const currentExercises = exercises.filter(ex => ex.sectionId === state.currentSectionId);
        if (currentExercises.length > 0 && state.currentExerciseIndex < currentExercises.length) {
          set({ currentExercise: currentExercises[state.currentExerciseIndex] });
        }
      },
      
      setCurrentSection: (sectionId) => {
        const state = get();
        const sectionExercises = state.exercises.filter(ex => ex.sectionId === sectionId);
        set({
          currentSectionId: sectionId,
          currentExerciseIndex: 0,
          currentExercise: sectionExercises[0] || null,
          currentResponse: '',
        });
      },
      
      setCurrentExercise: (index) => {
        const state = get();
        const sectionExercises = state.exercises.filter(ex => ex.sectionId === state.currentSectionId);
        if (index >= 0 && index < sectionExercises.length) {
          // Load saved response for the exercise
          const savedResponse = state.loadResponse(sectionExercises[index].id);
          
          set({
            currentExerciseIndex: index,
            currentExercise: sectionExercises[index],
            currentResponse: savedResponse,
          });
        }
      },
      
      setCurrentResponse: (response) => {
        set({ currentResponse: response });
      },
      
      saveResponse: (exerciseId, response) => {
        set(state => ({
          responses: { ...state.responses, [exerciseId]: response }
        }));
      },
      
      loadResponse: (exerciseId) => {
        const state = get();
        return state.responses[exerciseId] || '';
      },
      
      nextExercise: () => {
        const state = get();
        const sectionExercises = state.exercises.filter(ex => ex.sectionId === state.currentSectionId);
        const nextIndex = state.currentExerciseIndex + 1;
        
        // Save current response before moving (only save to local state, API call handled by component)
        if (state.currentExercise && state.currentResponse.trim()) {
          state.saveResponse(state.currentExercise.id, state.currentResponse);
        }
        
        if (nextIndex < sectionExercises.length) {
          // Load saved response for next exercise
          const savedResponse = state.loadResponse(sectionExercises[nextIndex].id);
          
          set({
            currentExerciseIndex: nextIndex,
            currentExercise: sectionExercises[nextIndex],
            currentResponse: savedResponse,
          });
        } else {
          // End of section - show feedback dialog
          set({ showFeedbackDialog: true });
        }
      },
      
      previousExercise: () => {
        const state = get();
        const sectionExercises = state.exercises.filter(ex => ex.sectionId === state.currentSectionId);
        const prevIndex = state.currentExerciseIndex - 1;
        
        // Save current response before moving (only save to local state, API call handled by component)
        if (state.currentExercise && state.currentResponse.trim()) {
          state.saveResponse(state.currentExercise.id, state.currentResponse);
        }
        
        if (prevIndex >= 0) {
          // Load saved response for previous exercise
          const savedResponse = state.loadResponse(sectionExercises[prevIndex].id);
          
          set({
            currentExerciseIndex: prevIndex,
            currentExercise: sectionExercises[prevIndex],
            currentResponse: savedResponse,
          });
        }
      },
      
      // Timer actions
      startTimer: () => {
        set(state => ({
          timer: { ...state.timer, isRunning: true }
        }));
      },
      
      pauseTimer: () => {
        set(state => ({
          timer: { ...state.timer, isRunning: false }
        }));
      },
      
      resetTimer: (minutes) => {
        const state = get();
        const timerMinutes = minutes || state.settings?.pomodoroMinutes || 25;
        set({
          timer: {
            minutes: timerMinutes,
            seconds: 0,
            isRunning: true,
            isPomodoro: true,
          }
        });
      },
      
      updateTimer: () => {
        set(state => {
          if (!state.timer.isRunning) return state;
          
          if (state.timer.seconds === 0) {
            if (state.timer.minutes === 0) {
              // Timer finished
              return {
                ...state,
                timer: { ...state.timer, isRunning: false }
              };
            }
            return {
              ...state,
              timer: {
                ...state.timer,
                minutes: state.timer.minutes - 1,
                seconds: 59,
              }
            };
          } else {
            return {
              ...state,
              timer: {
                ...state.timer,
                seconds: state.timer.seconds - 1,
              }
            };
          }
        });
      },
      
      // Settings actions
      setSettings: (settings) => {
        set({ settings });
        if (settings.pomodoroMinutes) {
          const state = get();
          if (state.timer.isPomodoro) {
            set({
              timer: {
                ...state.timer,
                minutes: settings.pomodoroMinutes,
                seconds: 0,
              }
            });
          }
        }
      },
      
      updateSettings: (updates) => {
        set(state => ({
          settings: state.settings ? { ...state.settings, ...updates } : null
        }));
      },
      
      toggleSettings: () => {
        set(state => ({ isSettingsOpen: !state.isSettingsOpen }));
      },
      
      setAutoSaveStatus: (status) => {
        set({ autoSaveStatus: status });
      },
      
      setShowFeedbackDialog: (show) => {
        set({ showFeedbackDialog: show });
      },
    }),
    {
      name: 'math-study-store',
      partialize: (state) => ({
        currentSectionId: state.currentSectionId,
        currentExerciseIndex: state.currentExerciseIndex,
        responses: state.responses,
        settings: state.settings,
      }),
    }
  )
);
