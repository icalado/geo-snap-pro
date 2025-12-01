import exifr from 'exifr';

export interface GeoData {
  lat: number;
  lon: number;
  alt: string | number;
  datetime: string | null;
  imgDataURL: string;
}

export async function extractGeoFromImage(file: File): Promise<GeoData | null> {
  try {
    console.log('Starting EXIF extraction for:', file.name);
    
    // Parse GPS data using exifr
    const gps = await exifr.gps(file);
    
    if (!gps || !gps.latitude || !gps.longitude) {
      console.log('No GPS data found in image');
      return null;
    }

    console.log('GPS data extracted:', gps);

    // Get additional EXIF data
    const exif = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'DateTime', 'GPSAltitude']
    });

    const datetime = exif?.DateTimeOriginal || exif?.DateTime || null;
    const alt = exif?.GPSAltitude || 'N/A';

    // Convert file to data URL
    const imgDataURL = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return {
      lat: gps.latitude,
      lon: gps.longitude,
      alt,
      datetime: datetime ? new Date(datetime).toISOString() : null,
      imgDataURL,
    };
  } catch (error) {
    console.error('Error extracting GPS from image:', error);
    return null;
  }
}
