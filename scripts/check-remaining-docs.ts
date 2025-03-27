import { connectToDatabase } from '../lib/mongodb';
import { Document } from '../models/Document';

async function checkRemainingDocs() {
  try {
    await connectToDatabase();
    console.log('Connected to database');

    // Get a sample of remaining documents
    const documents = await Document.find({}, {
      'title': 1,
      'metadata': 1,
      '_id': 0
    }).limit(10);

    console.log('\nSample of remaining documents:');
    documents.forEach((doc, index) => {
      console.log(`\nDocument ${index + 1}:`);
      console.log('Title:', doc.title);
      console.log('Metadata:', Object.fromEntries(doc.metadata));
    });

    // Get count by source
    const sources = await Document.aggregate([
      {
        $group: {
          _id: '$metadata.source',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\nDocument counts by source:');
    sources.forEach(source => {
      console.log(`${source._id}: ${source.count} documents`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error checking documents:', error);
    process.exit(1);
  }
}

checkRemainingDocs(); 