import https from 'https';
import http from 'http';

export interface PropertyLinkData {
  name: string;
  address: string;
  link: string;
}

/**
 * Extracts property listings from Booked Directly HTML
 */
export function parsePropertyListingsHTML(html: string): PropertyLinkData[] {
  const properties: PropertyLinkData[] = [];
  
  // Pattern to match property cards with name, address, and link
  const cardRegex = /<a href="(\/g\/[^"]+)"[^>]*>[\s\S]*?<h5 class="card-title[^>]*>[\s\S]*?<span class="float-left ellipsis[^>]*>([^<]+)<\/span>[\s\S]*?<span class="card-text">([^<]+)<\/span>/g;
  
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const [_, link, rawName, rawAddress] = match;
    
    // Decode HTML entities
    const name = decodeHTMLEntities(rawName.trim());
    const address = decodeHTMLEntities(rawAddress.trim());
    const fullLink = `https://northstaystays.bookeddirectly.com${link}`;
    
    properties.push({
      name,
      address,
      link: fullLink,
    });
  }
  
  console.log(`[PROPERTY-IMPORTER] Extracted ${properties.length} properties from HTML`);
  return properties;
}

/**
 * Fetches property listings from Booked Directly website
 */
export async function fetchPropertyListings(): Promise<PropertyLinkData[]> {
  const url = 'https://northstaystays.bookeddirectly.com/g/listings';
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Check for non-2xx status codes
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        // Handle redirects
        if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)) {
          const location = res.headers.location;
          if (location) {
            console.log(`[PROPERTY-IMPORTER] Following redirect to: ${location}`);
            https.get(location, (redirectRes) => {
              let html = '';
              
              redirectRes.on('data', (chunk) => {
                html += chunk;
              });
              
              redirectRes.on('end', () => {
                try {
                  const properties = parsePropertyListingsHTML(html);
                  resolve(properties);
                } catch (error) {
                  reject(new Error(`Failed to parse HTML after redirect: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
              });
            }).on('error', (error) => {
              reject(new Error(`Failed to follow redirect: ${error.message}`));
            });
            return;
          }
        }
        
        return reject(new Error(`HTTP ${res.statusCode}: Failed to fetch property listings. The website may be blocking requests or temporarily unavailable.`));
      }
      
      let html = '';
      
      res.on('data', (chunk) => {
        html += chunk;
      });
      
      res.on('end', () => {
        if (!html || html.trim().length === 0) {
          return reject(new Error('Received empty response from website. The site may be down or blocking requests.'));
        }
        
        try {
          const properties = parsePropertyListingsHTML(html);
          
          if (properties.length === 0) {
            return reject(new Error('No properties found in the response. The website HTML structure may have changed.'));
          }
          
          resolve(properties);
        } catch (error) {
          reject(new Error(`Failed to parse HTML: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Network error while fetching property listings: ${error.message}`));
    });
  });
}

/**
 * Helper to decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x2F;': '/',
    '&#39;': "'",
    '&apos;': "'",
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

/**
 * Converts property data to critical info format
 */
export function convertToCriticalInfoItems(properties: PropertyLinkData[], updatedBy: string) {
  return properties.map(property => ({
    category: "Property Link",
    propertyName: property.address || property.name,
    title: property.name,
    value: property.link,
    notes: property.address ? `Address: ${property.address}` : undefined,
    updatedBy,
  }));
}
