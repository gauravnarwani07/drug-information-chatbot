import { connectToDatabase } from '../lib/mongodb';
import { Document } from '../models/Document';

async function cleanupDatabase() {
  try {
    await connectToDatabase();
    console.log('Connected to database');

    // Delete FDA drug label documents
    const result = await Document.deleteMany({
      'metadata.source': 'FDA Drug Label Database'
    });

    console.log(`Deleted ${result.deletedCount} documents`);

    // Get remaining count
    const remainingCount = await Document.countDocuments();
    console.log(`Remaining documents: ${remainingCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up database:', error);
    process.exit(1);
  }
}

cleanupDatabase(); 