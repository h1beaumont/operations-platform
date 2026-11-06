import Papa from 'papaparse';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface CleaningCostCSVRow {
  'Property Name': string;
  'Cleaning Fee': string;
  'Linen Cost': string;
  'Disposable Cost': string;
  'Cleaning Product Cost': string;
  'Labour Cost': string;
  'Net Profit': string;
  'Profit Margin (%)': string;
}

export async function parseCleaningCostCSV(): Promise<Array<{
  propertyName: string;
  cleaningFee: string;
  linenCost: string;
  disposableCost: string;
  cleaningProductCost: string;
  labourCost: string;
  netProfit: string;
  profitMargin: string;
}>> {
  const csvPath = join(process.cwd(), 'attached_assets', 'Cleaning Cost Breakdown_2025-10-22T21_38_08_1761169105540.csv');
  const csvContent = await readFile(csvPath, 'utf-8');

  return new Promise((resolve, reject) => {
    Papa.parse<CleaningCostCSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        return header.trim();
      },
      complete: (results) => {
        const costs = results.data
          .filter(row => row['Property Name'] && row['Property Name'].trim() !== '')
          .map(row => ({
            propertyName: row['Property Name'].trim(),
            cleaningFee: row['Cleaning Fee'] || '0',
            linenCost: row['Linen Cost'] || '0',
            disposableCost: row['Disposable Cost'] || '0',
            cleaningProductCost: row['Cleaning Product Cost'] || '0',
            labourCost: row['Labour Cost'] || '0',
            netProfit: row['Net Profit'] || '0',
            profitMargin: row['Profit Margin (%)'] || '0',
          }));

        resolve(costs);
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    });
  });
}
