import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Tesseract from 'tesseract.js';

interface FieldPhotoUploadProps {
  projects: Array<{ id: string; name: string }>;
  onUploadComplete?: () => void;
}

export default function FieldPhotoUpload({ projects, onUploadComplete }: FieldPhotoUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [utmCoords, setUtmCoords] = useState<{ zone: string; easting: string; northing: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Feedback visual imediato
    setIsProcessing(true);
    setSelectedFile(file);
    setExtractedText('');
    setUtmCoords(null);

    try {
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.info('Processando imagem...', {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
      });

      // Extrair texto com Tesseract
      const { data } = await Tesseract.recognize(file, 'por', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`Progresso OCR: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const extractedFullText = data.text;
      setExtractedText(extractedFullText);

      console.log('Texto extraído:', extractedFullText);

      // Regex para coordenadas UTM no formato: "23K 324621 7364981"
      // Formato: zona (número + letra), easting (6-7 dígitos), northing (6-7 dígitos)
      const utmRegex = /(\d{1,2}[A-Z])\s+(\d{6,7})\s+(\d{6,7})/i;
      const match = extractedFullText.match(utmRegex);

      if (match) {
        const coords = {
          zone: match[1],
          easting: match[2],
          northing: match[3],
        };
        setUtmCoords(coords);
        toast.success('Coordenadas UTM encontradas!', {
          description: `${coords.zone} ${coords.easting} ${coords.northing}`,
          icon: <CheckCircle2 className="w-4 h-4" />,
        });
      } else {
        toast.warning('Coordenadas UTM não encontradas', {
          description: 'A foto será salva sem coordenadas',
          icon: <AlertCircle className="w-4 h-4" />,
        });
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast.error('Erro ao processar imagem', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecione uma foto primeiro');
      return;
    }

    if (!selectedProject) {
      toast.error('Selecione um projeto');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsProcessing(true);

    try {
      // Upload para storage
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      
      toast.info('Fazendo upload da foto...');
      
      const { error: uploadError } = await supabase.storage
        .from('field-photos')
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('field-photos')
        .getPublicUrl(fileName);

      // Salvar no banco de dados
      const photoLogData = {
        user_id: user.id,
        image_url: publicUrl,
        extracted_text: extractedText || null,
        utm_raw: utmCoords ? `${utmCoords.zone} ${utmCoords.easting} ${utmCoords.northing}` : null,
        latitude: null, // Poderia converter UTM para lat/lon aqui
        longitude: null,
        captured_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from('photo_logs')
        .insert(photoLogData);

      if (dbError) {
        throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
      }

      toast.success('Foto enviada com sucesso!', {
        icon: <CheckCircle2 className="w-4 h-4" />,
      });

      // Resetar form
      setSelectedFile(null);
      setPreviewUrl('');
      setExtractedText('');
      setUtmCoords(null);
      setNotes('');
      setSelectedProject('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadComplete?.();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload de Foto de Campo
        </CardTitle>
        <CardDescription>
          Envie fotos com coordenadas UTM. O sistema extrairá automaticamente as coordenadas do rodapé da foto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção de Projeto */}
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

        {/* Upload de arquivo */}
        <div className="space-y-2">
          <Label htmlFor="photo-upload">Foto</Label>
          <Input
            id="photo-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isProcessing}
            className="cursor-pointer"
          />
        </div>

        {/* Preview e Status */}
        {previewUrl && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-auto max-h-96 object-contain bg-muted"
              />
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Processando imagem...
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Extraindo texto com OCR
                  </p>
                </div>
              </div>
            )}

            {!isProcessing && extractedText && (
              <>
                {utmCoords ? (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Coordenadas UTM detectadas
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1 font-mono">
                          Zona: {utmCoords.zone} | E: {utmCoords.easting} | N: {utmCoords.northing}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                          Coordenadas não encontradas
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                          A foto será salva mesmo assim. Você pode adicionar as coordenadas manualmente depois.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Texto extraído (opcional, para debug) */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Ver texto extraído (debug)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {extractedText}
                  </pre>
                </details>
              </>
            )}
          </div>
        )}

        {/* Anotações */}
        <div className="space-y-2">
          <Label htmlFor="notes">Anotações (Opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Adicione observações sobre esta foto..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={isProcessing}
          />
        </div>

        {/* Botão de Upload */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !selectedProject || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Enviar Foto
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}