import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Upload, FileText, Plus } from 'lucide-react';
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
    groqModelId: 'llama-3.1-8b-instant',
    feedbackPrompt: 'Eres un profesor de matemáticas experto. Analiza la respuesta del estudiante y proporciona retroalimentación constructiva con explicaciones claras y ejemplos cuando sea necesario.',
    currentSection: 1,
  });

  // Section files management state
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        modelId: formData.groqModelId,
      });
      return response.json();
    },
  });

  // Section files queries and mutations
  const { data: sectionFiles = [] } = useQuery<string[]>({
    queryKey: ['/api/sections/files'],
    enabled: showSectionManager,
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ filename, content }: { filename: string; content: string }) => {
      const response = await apiRequest('POST', '/api/sections/upload', { filename, content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sections/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bkt/domains'] });
      setNewFileName('');
      setNewFileContent('');
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await apiRequest('DELETE', `/api/sections/files/${filename}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sections/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/exercises'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bkt/domains'] });
    },
  });

  // Load settings into form
  useEffect(() => {
    if (serverSettings) {
      setFormData({
        pomodoroMinutes: serverSettings.pomodoroMinutes || 25,
        maxTimeMinutes: serverSettings.maxTimeMinutes || 10,
        groqApiKey: serverSettings.groqApiKey || '',
        groqModelId: serverSettings.groqModelId || 'llama-3.1-8b-instant',
        feedbackPrompt: serverSettings.feedbackPrompt || 'Eres un profesor de matemáticas experto. Analiza la respuesta del estudiante y proporciona retroalimentación constructiva con explicaciones claras y ejemplos cuando sea necesario.',
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

  // Handle file upload
  const handleFileUpload = () => {
    if (!newFileName.trim() || !newFileContent.trim()) {
      return;
    }
    
    let filename = newFileName.trim();
    if (!filename.endsWith('.js')) {
      filename += '.js';
    }
    
    uploadFileMutation.mutate({ filename, content: newFileContent });
  };

  // Handle file deletion
  const handleFileDelete = (filename: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el archivo ${filename}?`)) {
      deleteFileMutation.mutate(filename);
    }
  };

  // Handle file input
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.js')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setNewFileName(file.name);
        setNewFileContent(content);
      };
      reader.readAsText(file);
    }
  };

  // Calculate section options
  const sectionOptions = exercises.length > 0
    ? Array.from(new Set(exercises.map(ex => ex.sectionId))).sort()
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
      <DialogContent className="bg-gray-925 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-gray-200">
            Configuración
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Section Selector with File Manager Button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-300">
                Sección actual
              </Label>
              <Button
                onClick={() => setShowSectionManager(!showSectionManager)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
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

          {/* Section File Manager */}
          {showSectionManager && (
            <div className="border border-gray-700 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-200">Gestión de Secciones</h3>
                <Button
                  onClick={() => setShowSectionManager(false)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                >
                  ×
                </Button>
              </div>

              {/* Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    variant="outline"
                    className="bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Seleccionar archivo
                  </Button>
                  <span className="text-xs text-gray-500">Solo archivos .js</span>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".js"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {newFileName && (
                  <div className="space-y-2">
                    <Input
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="Nombre del archivo"
                      className="bg-gray-800 border-gray-700 text-gray-200"
                    />
                    <Textarea
                      value={newFileContent}
                      onChange={(e) => setNewFileContent(e.target.value)}
                      placeholder="Contenido del archivo JavaScript..."
                      className="bg-gray-800 border-gray-700 text-gray-200 h-32 font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleFileUpload}
                        disabled={uploadFileMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {uploadFileMutation.isPending ? 'Subiendo...' : 'Subir'}
                      </Button>
                      <Button
                        onClick={() => {
                          setNewFileName('');
                          setNewFileContent('');
                        }}
                        size="sm"
                        variant="outline"
                        className="bg-gray-800 border-gray-600 text-gray-200"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* File List */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Archivos subidos ({sectionFiles.length})
                </h4>
                {sectionFiles.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No hay archivos subidos</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {sectionFiles.map((filename) => (
                      <div
                        key={filename}
                        className="flex items-center justify-between bg-gray-800 rounded px-2 py-1"
                      >
                        <span className="text-xs text-gray-200 font-mono">{filename}</span>
                        <Button
                          onClick={() => handleFileDelete(filename)}
                          disabled={deleteFileMutation.isPending}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(uploadFileMutation.isSuccess || deleteFileMutation.isSuccess) && (
                <p className="text-xs text-green-400">✓ Operación completada. Las secciones se han actualizado.</p>
              )}
              {(uploadFileMutation.isError || deleteFileMutation.isError) && (
                <p className="text-xs text-red-400">✗ Error al procesar el archivo.</p>
              )}
            </div>
          )}
          
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

          {/* Groq Model Selection */}
          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-300">
              Modelo de IA (Groq)
            </Label>
            <Select
              value={formData.groqModelId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, groqModelId: value }))}
            >
              <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="llama-3.1-8b-instant" className="text-gray-200 focus:bg-gray-700">
                  Llama 3.1 8B (Rápido)
                </SelectItem>
                <SelectItem value="llama-3.1-70b-versatile" className="text-gray-200 focus:bg-gray-700">
                  Llama 3.1 70B (Versátil)
                </SelectItem>
                <SelectItem value="llama-3.2-1b-preview" className="text-gray-200 focus:bg-gray-700">
                  Llama 3.2 1B (Preview)
                </SelectItem>
                <SelectItem value="llama-3.2-3b-preview" className="text-gray-200 focus:bg-gray-700">
                  Llama 3.2 3B (Preview)
                </SelectItem>
                <SelectItem value="mixtral-8x7b-32768" className="text-gray-200 focus:bg-gray-700">
                  Mixtral 8x7B (32K tokens)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Selecciona el modelo de IA para generar feedback
            </p>
          </div>

          {/* Custom Feedback Prompt */}
          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-300">
              Prompt personalizado para feedback
            </Label>
            <Textarea
              placeholder="Personaliza cómo la IA genera feedback..."
              value={formData.feedbackPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, feedbackPrompt: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 min-h-[100px]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Define cómo quieres que la IA analice y responda a tus ejercicios
            </p>
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
