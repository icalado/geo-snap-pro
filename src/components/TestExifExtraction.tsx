import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { extractGeoFromImage } from '@/lib/geo';
import { toast } from 'sonner';

export default function TestExifExtraction() {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testExtraction = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      // Fetch the test photo
      const response = await fetch('/src/assets/test-photo.jpg');
      const blob = await response.blob();
      const file = new File([blob], 'test-photo.jpg', { type: 'image/jpeg' });
      
      console.log('Testing EXIF extraction on test photo...');
      const geoData = await extractGeoFromImage(file);
      
      if (geoData) {
        console.log('✅ EXIF extraction successful:', geoData);
        setResult(geoData);
        toast.success('EXIF extraído com sucesso!');
      } else {
        console.log('❌ No GPS data found in image');
        setResult({ error: 'Nenhum dado GPS encontrado' });
        toast.error('Nenhum dado GPS encontrado');
      }
    } catch (error) {
      console.error('❌ Error testing EXIF:', error);
      setResult({ error: (error as Error).message });
      toast.error('Erro ao extrair EXIF: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste de Extração EXIF</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testExtraction} disabled={isLoading}>
          {isLoading ? 'Testando...' : 'Testar Extração GPS'}
        </Button>
        
        {result && (
          <div className="p-4 bg-muted rounded-lg">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
