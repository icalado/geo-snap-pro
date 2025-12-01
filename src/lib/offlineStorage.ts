import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflinePhoto {
  id: string;
  user_id: string;
  project_id: string;
  blob: Blob;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  notes: string | null;
  timestamp: string;
  created_at: string;
}

interface GeoSnapDB extends DBSchema {
  'pending-photos': {
    key: string;
    value: OfflinePhoto;
    indexes: { 'by-timestamp': string };
  };
}

let dbPromise: Promise<IDBPDatabase<GeoSnapDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<GeoSnapDB>('geosnap-offline', 1, {
      upgrade(db) {
        const photoStore = db.createObjectStore('pending-photos', {
          keyPath: 'id',
        });
        photoStore.createIndex('by-timestamp', 'created_at');
      },
    });
  }
  return dbPromise;
};

export const savePendingPhoto = async (photo: OfflinePhoto) => {
  const db = await getDB();
  await db.add('pending-photos', photo);
};

export const getPendingPhotos = async (): Promise<OfflinePhoto[]> => {
  const db = await getDB();
  return await db.getAll('pending-photos');
};

export const deletePendingPhoto = async (id: string) => {
  const db = await getDB();
  await db.delete('pending-photos', id);
};

export const clearPendingPhotos = async () => {
  const db = await getDB();
  await db.clear('pending-photos');
};
