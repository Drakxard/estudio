import { useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings, Timer } from 'lucide-react';
import { SettingsModal } from '@/components/SettingsModal';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { apiRequest } from '@/lib/queryClient';
import type { Exercise, Settings as SettingsType } from '@shared/schema';

export default function StudyInterface() {
  const {
    setExercises,
    setSettings,
    toggleSettings,
    currentSectionId,
    setCurrentSection,
    currentExercise,
    currentExerciseIndex,
    currentResponse,
    setCurrentResponse,
    saveResponse,
    nextExercise,
    previousExercise,
    exercises,
    timer,
    isSettingsOpen,
    setAutoSaveStatus,
    autoSaveStatus,
    settings: appSettings,
  } = useAppStore();

  // Load exercises
  const { data: exercisesData } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises'],
  });

  // Load settings
  const { data: settings } = useQuery<SettingsType>({
    queryKey: ['/api/settings'],
  });

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async ({ exerciseId, content }: { exerciseId: number; content: string }) => {
      setAutoSaveStatus('saving');
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseId,
          content,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setAutoSaveStatus('saved');
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
    },
  });

  // Initialize data
  useEffect(() => {
    if (exercisesData) {
      setExercises(exercisesData);
    }
  }, [exercisesData, setExercises]);

  useEffect(() => {
    if (settings) {
      setSettings(settings);
      if (settings.currentSection && settings.currentSection !== currentSectionId) {
        setCurrentSection(settings.currentSection);
      }
    }
  }, [settings, setSettings, currentSectionId, setCurrentSection]);

  // Debounced auto-save
  const debouncedAutoSave = useCallback(
    (exerciseId: number, content: string) => {
      const timeoutId = setTimeout(() => {
        if (content.trim()) {
          autoSaveMutation.mutate({ exerciseId, content });
          saveResponse(exerciseId, content);
        }
      }, 1000); // Save after 1 second of inactivity

      return () => clearTimeout(timeoutId);
    },
    [autoSaveMutation, saveResponse]
  );

  // Auto-save when response changes
  useEffect(() => {
    if (currentExercise && currentResponse) {
      const cleanup = debouncedAutoSave(currentExercise.id, currentResponse);
      return cleanup;
    }
  }, [currentResponse, currentExercise, debouncedAutoSave]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleSettings();
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        previousExercise();
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        nextExercise();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSettings, nextExercise, previousExercise]);

  // Get current section exercises
  const sectionExercises = exercises.filter(ex => ex.sectionId === currentSectionId);
  const totalSections = exercises.length > 0 ? Math.max(...exercises.map(ex => ex.sectionId)) : 1;

  // Format timer display
  const formatTime = (minutes: number, seconds: number): string => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get exercise display text
  const getExerciseText = () => {
    if (!currentExercise) return "Selecciona una sección para comenzar";
    const statement = currentExercise.enunciado;
    const exercise = currentExercise.ejercicio;
    
    if (statement && exercise) {
      return `${statement}\n\n${exercise}`;
    }
    return exercise || statement || "Sin contenido";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col">
      {/* Top Bar with Indicators */}
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        {/* Section Indicator */}
        <div className="text-sm text-gray-400">
          Sección {currentSectionId}/{totalSections}
        </div>

        {/* Timer */}
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Timer className="w-4 h-4" />
          <span className="font-mono">
            {formatTime(timer.minutes, timer.seconds)}
          </span>
        </div>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSettings}
          className="p-2 hover:bg-gray-800 text-gray-400 hover:text-gray-200"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Navigation */}
        <div className="w-12 flex items-center justify-center border-r border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={previousExercise}
            disabled={currentExerciseIndex === 0}
            className="p-2 hover:bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col">
          {/* Exercise Statement */}
          <div className="flex-1 p-8 flex flex-col justify-center">
            <div className="max-w-4xl mx-auto w-full">
              {/* Topic */}
              {currentExercise && (
                <div className="text-center text-gray-500 text-sm mb-6">
                  {currentExercise.tema}
                </div>
              )}

              {/* Statement */}
              <div className="bg-gray-925 border border-gray-800 rounded-xl p-8 mb-8">
                <div className="text-lg leading-relaxed whitespace-pre-line">
                  {getExerciseText()}
                </div>
              </div>

              {/* Response Area */}
              <div className="space-y-4">
                <textarea
                  value={currentResponse}
                  onChange={(e) => setCurrentResponse(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full h-64 bg-gray-925 border border-gray-800 rounded-xl p-6 text-lg leading-relaxed resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-500"
                />

                {/* Progress */}
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-800 rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${sectionExercises.length > 0 ? ((currentExerciseIndex + 1) / sectionExercises.length) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span>
                      {currentExerciseIndex + 1} de {sectionExercises.length}
                    </span>
                  </div>
                  
                  <div className={`text-sm ${
                    autoSaveStatus === 'saving' ? 'text-yellow-500' : 
                    autoSaveStatus === 'error' ? 'text-red-500' : 
                    'text-gray-600'
                  }`}>
                    {autoSaveStatus === 'saving' ? 'Guardando...' : 
                     autoSaveStatus === 'error' ? 'Error al guardar' : 
                     'Guardado automáticamente'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Navigation */}
        <div className="w-12 flex items-center justify-center border-l border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={nextExercise}
            disabled={currentExerciseIndex >= sectionExercises.length - 1}
            className="p-2 hover:bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bottom Shortcuts */}
      <div className="text-center p-4 text-xs text-gray-600 border-t border-gray-800">
        Ctrl+← Anterior • Ctrl+→ Siguiente • Esc Configuración
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal />}
      
      {/* Feedback Dialog */}
      <FeedbackDialog />
    </div>
  );
}