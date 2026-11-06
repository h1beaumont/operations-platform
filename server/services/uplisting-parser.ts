import Papa from 'papaparse';

interface UplistingBookingRow {
  'Property name': string;
  'Check out': string;
  'Booking ID'?: string;
}

export interface ParsedCheckout {
  checkoutDate: string;
  propertyName: string;
  bookingId?: string;
}

export function parseUplistingBookingReport(csvContent: string): ParsedCheckout[] {
  const results: ParsedCheckout[] = [];
  
  const parsed = Papa.parse<UplistingBookingRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parsing errors: ${parsed.errors.map(e => e.message).join(', ')}`);
  }

  for (const row of parsed.data) {
    const propertyName = row['Property name'];
    const checkoutDate = row['Check out'];
    const bookingId = row['Booking ID'];

    if (propertyName && checkoutDate) {
      results.push({
        propertyName: propertyName.trim(),
        checkoutDate: checkoutDate.split(' ')[0],
        bookingId: bookingId?.trim(),
      });
    }
  }

  return results;
}

export function extractPeriodFromFilename(filename: string): { start: string | null; end: string | null } {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return { start: match[1], end: match[2] };
  }
  return { start: null, end: null };
}
