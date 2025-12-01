import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import Tesseract from 'tesseract.js';

interface FieldPhotoUploadProps {
  projects: Array<{ id: string; name: string }>;
  onUploadComplete?: () => void;
}

type FileStatus = 'waiting' | 'scanning' | 'uploading' | 'done' | 'error';

interface PhotoFile {
  file: File;
  previewUrl: string;
  status: FileStatus;
  extractedText?: string;
  utmCoords?: { zone: string; easting: string; northing: string };
  errorMessage?: string;
}

export default function FieldPhotoUpload({ projects, onUploadComplete }: FieldPhotoUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [photoFiles, setPhotoFiles] = useState<PhotoFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Create preview URLs for all selected files
    const newPhotoFiles: PhotoFile[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'waiting' as FileStatus,
    }));

    setPhotoFiles(newPhotoFiles);
    toast.success(`${files.length} foto(s) selecionada(s)`);
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updatePhotoStatus = (index: number, updates: Partial<PhotoFile>) => {
    setPhotoFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const processPhotoOCR = async (file: File): Promise<{ 
    extractedText: string; 
    utmCoords?: { zone: string; easting: string; northing: string } 
  }> => {
    // Extract text with Tesseract
    const { data } = await Tesseract.recognize(file, 'por', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const extractedText = data.text;

    // Regex for UTM coordinates: "23K 324621 7364981"
    const utmRegex = /(\d{1,2}[A-Z])\s+(\d{6,7})\s+(\d{6,7})/i;
    const match = extractedText.match(utmRegex);

    let utmCoords;
    if (match) {
      utmCoords = {
        zone: match[1],
        easting: match[2],
        northing: match[3],
      };
    }

    return { extractedText, utmCoords };
  };

  const uploadPhotoToStorage = async (file: File): Promise<string> => {
    const fileName = `${user!.id}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('field-photos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('field-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const savePhotoToDatabase = async (
    imageUrl: string,
    extractedText: string,
    utmCoords?: { zone: string; easting: string; northing: string }
  ) => {
    const photoLogData = {
      user_id: user!.id,
      image_url: imageUrl,
      extracted_text: extractedText || null,
      utm_raw: utmCoords ? `${utmCoords.zone} ${utmCoords.easting} ${utmCoords.northing}` : null,
      latitude: null,
      longitude: null,
      captured_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabase
      .from('photo_logs')
      .insert(photoLogData);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }
  };

  const processAllPhotos = async () => {
    if (!selectedProject) {
      toast.error('Selecione um projeto');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (photoFiles.length === 0) {
      toast.error('Selecione pelo menos uma foto');
      return;
    }

    setIsProcessing(true);

    let successCount = 0;
    let errorCount = 0;

    // Process photos sequentially (one by one)
    for (let i = 0; i < photoFiles.length; i++) {
      const photoFile = photoFiles[i];

      try {
        // Step 1: Scan text (OCR)
        updatePhotoStatus(i, { status: 'scanning' });
        const { extractedText, utmCoords } = await processPhotoOCR(photoFile.file);
        
        updatePhotoStatus(i, { extractedText, utmCoords });

        // Step 2: Upload to storage
        updatePhotoStatus(i, { status: 'uploading' });
        const imageUrl = await uploadPhotoToStorage(photoFile.file);

        // Step 3: Save to database
        await savePhotoToDatabase(imageUrl, extractedText, utmCoords);

        // Step 4: Mark as done
        updatePhotoStatus(i, { status: 'done' });
        successCount++;

      } catch (error) {
        console.error(`Error processing photo ${i + 1}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        updatePhotoStatus(i, { 
          status: 'error', 
          errorMessage 
        });
        
        errorCount++;
        
        // Continue to next photo
        continue;
      }
    }

    setIsProcessing(false);

    // Show summary
    if (successCount > 0) {
      toast.success(`${successCount} foto(s) enviada(s) com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} foto(s) falharam. Verifique os detalhes.`);
    }

    // Call completion callback
    if (successCount > 0) {
      onUploadComplete?.();
    }

    // Reset after a delay
    setTimeout(() => {
      setPhotoFiles([]);
      setSelectedProject('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 3000);
  };

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'waiting':
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />;
      case 'scanning':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 animate-spin text-purple-600" />;
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case 'waiting':
        return 'Aguardando';
      case 'scanning':
        return 'Extraindo texto...';
      case 'uploading':
        return 'Enviando...';
      case 'done':
        return 'Concluído';
      case 'error':
        return 'Erro';
    }
  };

  const getStatusColor = (status: FileStatus) => {
    switch (status) {
      case 'waiting':
        return 'text-muted-foreground';
      case 'scanning':
        return 'text-blue-600';
      case 'uploading':
        return 'text-purple-600';
      case 'done':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload de Fotos de Campo
        </CardTitle>
        <CardDescription>
          Envie múltiplas fotos com coordenadas UTM. O sistema extrairá automaticamente as coordenadas do rodapé de cada foto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Selection */}
        <div className="space-y-2">
          <Label>Projeto</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isProcessing}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="photo-upload">Fotos</Label>
          <Input
            id="photo-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelection}
            disabled={isProcessing}
            className="cursor-pointer"
          />
        </div>

        {/* Photo Grid */}
        {photoFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">
                Fotos Selecionadas ({photoFiles.length})
              </Label>
              {!isProcessing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    photoFiles.forEach(p => URL.revokeObjectURL(p.previewUrl));
                    setPhotoFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Limpar Todas
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photoFiles.map((photoFile, index) => (
                <div
                  key={index}
                  className="relative rounded-lg border overflow-hidden bg-muted"
                >
                  <img
                    src={photoFile.previewUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  
                  {/* Remove button */}
                  {!isProcessing && photoFile.status === 'waiting' && (
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {/* Status Bar */}
                  <div className="p-2 bg-background/95 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(photoFile.status)}
                      <span className={`text-xs font-medium ${getStatusColor(photoFile.status)}`}>
                        {getStatusText(photoFile.status)}
                      </span>
                    </div>

                    {/* UTM Coordinates */}
                    {photoFile.utmCoords && (
                      <div className="mt-1 text-[10px] text-green-600 font-mono">
                        {photoFile.utmCoords.zone} {photoFile.utmCoords.easting} {photoFile.utmCoords.northing}
                      </div>
                    )}

                    {/* Error Message */}
                    {photoFile.status === 'error' && photoFile.errorMessage && (
                      <div className="mt-1 text-[10px] text-red-600">
                        {photoFile.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={processAllPhotos}
          disabled={photoFiles.length === 0 || !selectedProject || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando ({photoFiles.filter(p => p.status === 'done').length}/{photoFiles.length})
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Enviar {photoFiles.length > 0 ? `${photoFiles.length} Foto(s)` : 'Fotos'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
