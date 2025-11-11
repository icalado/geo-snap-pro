import EXIF from 'exif-js';

export interface GeoData {
  lat: number;
  lon: number;
  alt: string | number;
  datetime: string | null;
  imgDataURL: string;
}

function convertGPSCoordinate(coord: any[], ref: string): number | null {
  if (!coord || coord.length < 3) return null;
  
  const degrees = coord[0].numerator / coord[0].denominator;
  const minutes = coord[1].numerator / coord[1].denominator;
  const seconds = coord[2].numerator / coord[2].denominator;
  
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (ref === 'S' || ref === 'W') decimal *= -1;
  
  return Number(decimal.toFixed(6));
}

export function extractGeoFromImage(blob: Blob): Promise<GeoData | null> {
  return new Promise((resolve) => {
    EXIF.getData(blob as any, function(this: any) {
      const tags = EXIF.getAllTags(this);
      
      if (!tags || !tags.GPSLatitude || !tags.GPSLongitude) {
        resolve(null);
        return;
      }
      
      const lat = convertGPSCoordinate(tags.GPSLatitude, tags.GPSLatitudeRef);
      const lon = convertGPSCoordinate(tags.GPSLongitude, tags.GPSLongitudeRef);
      
      if (lat === null || lon === null) {
        resolve(null);
        return;
      }
      
      const alt = tags.GPSAltitude || 'N/A';
      const datetime = tags.DateTimeOriginal || tags.DateTime || null;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          lat,
          lon,
          alt,
          datetime,
          imgDataURL: e.target?.result as string,
        });
      };
      reader.readAsDataURL(blob);
    });
  });
}
