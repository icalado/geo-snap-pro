import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPendingPhotos, deletePendingPhoto } from '@/lib/offlineStorage';
import { toast } from 'sonner';

export const useOfflineSync = (userId: string | undefined) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const checkPendingCount = async () => {
    const pending = await getPendingPhotos();
    setPendingCount(pending.length);
  };

  const syncPhotos = async () => {
    if (!userId || !isOnline || isSyncing) return;

    setIsSyncing(true);
    const pendingPhotos = await getPendingPhotos();

    if (pendingPhotos.length === 0) {
      setIsSyncing(false);
      return;
    }

    toast.info(`Sincronizando ${pendingPhotos.length} foto(s)...`);

    let successCount = 0;
    let errorCount = 0;

    for (const photo of pendingPhotos) {
      try {
        // Upload to storage
        const fileName = `${photo.user_id}/${photo.project_id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photo.blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase.from('photos').insert({
          user_id: photo.user_id,
          project_id: photo.project_id,
          image_url: publicUrl,
          latitude: photo.latitude,
          longitude: photo.longitude,
          accuracy: photo.accuracy,
          altitude: photo.altitude,
          notes: photo.notes,
          timestamp: photo.timestamp,
        });

        if (dbError) throw dbError;

        // Delete from local storage
        await deletePendingPhoto(photo.id);
        successCount++;
      } catch (error) {
        console.error('Error syncing photo:', error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} foto(s) sincronizada(s) com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`Falha ao sincronizar ${errorCount} foto(s)`);
    }

    await checkPendingCount();
    setIsSyncing(false);
  };

  useEffect(() => {
    checkPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restaurada. Iniciando sincronização...');
      syncPhotos();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Modo offline. As fotos serão sincronizadas quando a conexão for restaurada.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync on mount if online and has pending photos
    if (isOnline) {
      syncPhotos();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncPhotos,
    checkPendingCount,
  };
};
