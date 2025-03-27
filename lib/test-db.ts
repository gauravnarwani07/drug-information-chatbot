import connectDB from './mongodb';

async function testConnection() {
  try {
    await connectDB();
    console.log('Successfully connected to MongoDB!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

// Run the test
testConnection(); 