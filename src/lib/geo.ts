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

export function extractGeoFromImage(file: File): Promise<GeoData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result;
      if (!arrayBuffer) {
        console.error('Failed to read file');
        resolve(null);
        return;
      }

      // Create a temporary image element to extract EXIF data
      const img = new Image();
      const blob = new Blob([arrayBuffer], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        EXIF.getData(img as any, function(this: any) {
          const tags = EXIF.getAllTags(this);
          
          console.log('EXIF Tags:', tags);
          
          if (!tags || !tags.GPSLatitude || !tags.GPSLongitude) {
            console.error('No GPS data found in image');
            resolve(null);
            return;
          }
          
          const lat = convertGPSCoordinate(tags.GPSLatitude, tags.GPSLatitudeRef);
          const lon = convertGPSCoordinate(tags.GPSLongitude, tags.GPSLongitudeRef);
          
          if (lat === null || lon === null) {
            console.error('Failed to convert GPS coordinates');
            resolve(null);
            return;
          }
          
          console.log('Extracted GPS:', { lat, lon });
          
          const alt = tags.GPSAltitude 
            ? (tags.GPSAltitude.numerator / tags.GPSAltitude.denominator) 
            : 'N/A';
          const datetime = tags.DateTimeOriginal || tags.DateTime || null;
          
          // Convert the file to data URL for storage
          const dataUrlReader = new FileReader();
          dataUrlReader.onload = (event) => {
            resolve({
              lat,
              lon,
              alt,
              datetime,
              imgDataURL: event.target?.result as string,
            });
          };
          dataUrlReader.readAsDataURL(file);
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        console.error('Failed to load image');
        resolve(null);
      };
      
      img.src = url;
    };
    
    reader.onerror = () => {
      console.error('Failed to read file as ArrayBuffer');
      resolve(null);
    };
    
    reader.readAsArrayBuffer(file);
  });
}
