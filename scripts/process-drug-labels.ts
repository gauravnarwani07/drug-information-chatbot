require('dotenv').config({ path: '.env.local' });
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { connectToDatabase } from '../lib/mongodb';
import { generateEmbedding } from '../lib/embeddings';
import { Document } from '../models/Document';

interface FDADrugLabel {
  'Labeling Type': string;
  'Trade Name': string;
  'Generic/Proper Name(s)': string;
  'Active Ingredient(s)': string;
  'Established Pharmacologic Class(es)': string;
  'Company': string;
  'FDALabel Link': string;
  'DailyMed SPL Link': string;
}

async function processDrugLabels(filePath: string) {
  console.log('Starting drug label processing...');
  
  // Read and parse CSV file
  const fileContent = readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    relax_column_count: true,
    trim: true,
    skip_empty_lines: true
  }) as FDADrugLabel[];

  console.log(`Found ${records.length} records to process`);
  
  // Connect to database
  await connectToDatabase();
  
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    try {
      // Skip records without required fields
      if (!record['Trade Name'] && !record['Generic/Proper Name(s)']) {
        skipCount++;
        continue;
      }

      // Create structured content
      const content = `
Drug Name: ${record['Trade Name'] || record['Generic/Proper Name(s)']}
Generic Name: ${record['Generic/Proper Name(s)'] || 'N/A'}
Active Ingredients: ${record['Active Ingredient(s)'] || 'N/A'}
Pharmacologic Class: ${record['Established Pharmacologic Class(es)'] || 'N/A'}
Manufacturer: ${record['Company'] || 'N/A'}
FDA Label Link: ${record['FDALabel Link'] || 'N/A'}
DailyMed Link: ${record['DailyMed SPL Link'] || 'N/A'}
      `.trim();

      // Generate embedding
      const embedding = await generateEmbedding(content);

      // Create document using Mongoose model
      const document = new Document({
        title: record['Trade Name'] || record['Generic/Proper Name(s)'],
        content,
        embedding,
        metadata: new Map([
          ['source', 'FDA Drug Label Database'],
          ['type', record['Labeling Type'] || 'Unknown'],
        ])
      });

      // Save to database
      await document.save();
      successCount++;

      // Log progress every 100 records
      if (successCount % 100 === 0) {
        console.log(`Progress: ${successCount}/${records.length} records processed successfully`);
      }
    } catch (error) {
      console.error(`Error processing record ${i + 1}:`, error);
      errorCount++;
    }
  }

  // Print summary
  console.log('\nProcessing complete!');
  console.log(`Total records: ${records.length}`);
  console.log(`Successfully processed: ${successCount}`);
  console.log(`Skipped (missing data): ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
}

// Get file path from command line arguments
const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a CSV file path as an argument');
  process.exit(1);
}

processDrugLabels(filePath).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 