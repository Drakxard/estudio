import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Settings } from '@shared/schema';

export function SettingsModal() {
  const queryClient = useQueryClient();
  const {
    isSettingsOpen,
    toggleSettings,
    settings,
    setSettings,
    currentSectionId,
    setCurrentSection,
    exercises,
    resetTimer,
  } = useAppStore();

  // Local state for form
  const [formData, setFormData] = useState({
    pomodoroMinutes: 25,
    maxTimeMinutes: 10,
    groqApiKey: '',
    currentSection: 1,
  });

  // Load settings from server
  const { data: serverSettings } = useQuery<Settings>({
    queryKey: ['/api/settings'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      const response = await apiRequest('PATCH', '/api/settings', data);
      return response.json();
    },
    onSuccess: (updatedSettings) => {
      setSettings(updatedSettings);
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });

  // Test API key mutation
  const testApiMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai/response', {
        exerciseText: 'Test: ¿Cuál es la derivada de x²?',
        apiKey: formData.groqApiKey,
      });
      return response.json();
    },
  });

  // Load settings into form
  useEffect(() => {
    if (serverSettings) {
      setFormData({
        pomodoroMinutes: serverSettings.pomodoroMinutes || 25,
        maxTimeMinutes: serverSettings.maxTimeMinutes || 10,
        groqApiKey: serverSettings.groqApiKey || '',
        currentSection: serverSettings.currentSection || 1,
      });
    }
  }, [serverSettings]);

  // Handle form submission
  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
    
    // Update current section if changed
    if (formData.currentSection !== currentSectionId) {
      setCurrentSection(formData.currentSection);
    }
    
    // Reset timer if pomodoro time changed
    if (formData.pomodoroMinutes !== settings?.pomodoroMinutes) {
      resetTimer(formData.pomodoroMinutes);
    }
    
    toggleSettings();
  };

  // Handle API key test
  const handleTestApi = () => {
    if (!formData.groqApiKey.trim()) {
      return;
    }
    testApiMutation.mutate();
  };

  // Calculate section options
  const sectionOptions = exercises.length > 0
    ? [...new Set(exercises.map(ex => ex.sectionId))].sort()
    : [1, 2, 3, 4, 5, 6, 7, 8];

  const getSectionName = (sectionId: number): string => {
    const sectionNames: Record<number, string> = {
      1: 'Preparación para el cálculo',
      2: 'Funciones y Gráficas',
      3: 'Funciones Inversas y Logaritmos',
      4: 'Límites y Continuidad',
      5: 'Derivadas',
      6: 'Aplicaciones de Derivadas',
      7: 'Integrales',
      8: 'Aplicaciones de Integrales',
    };
    return sectionNames[sectionId] || `Sección ${sectionId}`;
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={toggleSettings}>
      <DialogContent className="bg-gray-925 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-gray-200">
            Configuración
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Section Selector */}
          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-300">
              Sección actual
            </Label>
            <Select
              value={formData.currentSection.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, currentSection: parseInt(value) }))}
            >
              <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {sectionOptions.map((sectionId) => (
                  <SelectItem 
                    key={sectionId} 
                    value={sectionId.toString()}
                    className="text-gray-200 focus:bg-gray-700"
                  >
                    Sección {sectionId}: {getSectionName(sectionId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Pomodoro Settings */}
          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-300">
              Tiempo de sesión (Pomodoro)
            </Label>
            <div className="flex space-x-2">
              <Input
                type="number"
                min="1"
                max="60"
                value={formData.pomodoroMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, pomodoroMinutes: parseInt(e.target.value) || 25 }))}
                className="flex-1 bg-gray-800 border-gray-700 text-gray-200"
              />
              <span className="text-gray-400 self-center">minutos</span>
            </div>
          </div>
          
          {/* Max Time Settings */}
          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-300">
              Tiempo máximo por ejercicio
            </Label>
            <div className="flex space-x-2">
              <Input
                type="number"
                min="1"
                max="120"
                value={formData.maxTimeMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, maxTimeMinutes: parseInt(e.target.value) || 10 }))}
                className="flex-1 bg-gray-800 border-gray-700 text-gray-200"
              />
              <span className="text-gray-400 self-center">minutos</span>
            </div>
          </div>
          
          {/* Groq API Settings */}
          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-300">
              API de respuestas (Groq)
            </Label>
            <div className="flex space-x-2">
              <Input
                type="password"
                placeholder="Ingresa tu clave API de Groq"
                value={formData.groqApiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, groqApiKey: e.target.value }))}
                className="flex-1 bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500"
              />
              <Button
                onClick={handleTestApi}
                disabled={!formData.groqApiKey.trim() || testApiMutation.isPending}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-sm"
              >
                {testApiMutation.isPending ? 'Testing...' : 'Test'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Para obtener respuestas automáticas a tus ejercicios
            </p>
            {testApiMutation.isSuccess && (
              <p className="text-xs text-green-400 mt-1">✓ API conectada correctamente</p>
            )}
            {testApiMutation.isError && (
              <p className="text-xs text-red-400 mt-1">✗ Error al conectar con la API</p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="ghost"
            onClick={toggleSettings}
            className="text-gray-400 hover:text-gray-200"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateSettingsMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
