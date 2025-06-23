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
  
  // Timer
  timer: TimerState;
  
  // Settings
  settings: Settings | null;
  
  // UI state
  isSettingsOpen: boolean;
  isLoading: boolean;
  autoSaveStatus: 'saved' | 'saving' | 'error';
  
  // Actions
  setExercises: (exercises: Exercise[]) => void;
  setCurrentSection: (sectionId: number) => void;
  setCurrentExercise: (index: number) => void;
  setCurrentResponse: (response: string) => void;
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
      
      timer: {
        minutes: 25,
        seconds: 0,
        isRunning: true,
        isPomodoro: true,
      },
      
      settings: null,
      
      isSettingsOpen: false,
      isLoading: false,
      autoSaveStatus: 'saved',
      
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
          set({
            currentExerciseIndex: index,
            currentExercise: sectionExercises[index],
            currentResponse: '',
          });
        }
      },
      
      setCurrentResponse: (response) => {
        set({ currentResponse: response });
      },
      
      nextExercise: () => {
        const state = get();
        const sectionExercises = state.exercises.filter(ex => ex.sectionId === state.currentSectionId);
        const nextIndex = state.currentExerciseIndex + 1;
        
        if (nextIndex < sectionExercises.length) {
          set({
            currentExerciseIndex: nextIndex,
            currentExercise: sectionExercises[nextIndex],
            currentResponse: '',
          });
        }
      },
      
      previousExercise: () => {
        const state = get();
        const sectionExercises = state.exercises.filter(ex => ex.sectionId === state.currentSectionId);
        const prevIndex = state.currentExerciseIndex - 1;
        
        if (prevIndex >= 0) {
          set({
            currentExerciseIndex: prevIndex,
            currentExercise: sectionExercises[prevIndex],
            currentResponse: '',
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
        const state = get();
        if (!state.timer.isRunning) return;
        
        if (state.timer.seconds === 0) {
          if (state.timer.minutes === 0) {
            // Timer finished
            set(state => ({
              timer: { ...state.timer, isRunning: false }
            }));
            return;
          }
          set(state => ({
            timer: {
              ...state.timer,
              minutes: state.timer.minutes - 1,
              seconds: 59,
            }
          }));
        } else {
          set(state => ({
            timer: {
              ...state.timer,
              seconds: state.timer.seconds - 1,
            }
          }));
        }
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
    }),
    {
      name: 'math-study-store',
      partialize: (state) => ({
        currentSectionId: state.currentSectionId,
        currentExerciseIndex: state.currentExerciseIndex,
        settings: state.settings,
      }),
    }
  )
);
