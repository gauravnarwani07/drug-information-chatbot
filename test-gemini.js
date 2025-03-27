const { GoogleGenerativeAI } = require('@google/generative-ai');

// Get API key from environment variable
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('Error: GOOGLE_API_KEY is not set in environment variables');
  process.exit(1);
}

async function testGeminiAccess() {
  try {
    console.log('Initializing Gemini...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log('Testing Gemini 2.0 Flash access...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    console.log('Sending test message...');
    const result = await model.generateContent('Hello, this is a test message.');
    const response = await result.response;
    const text = response.text();
    
    console.log('\nSuccess! Your API key has access to Gemini 2.0 Flash.');
    console.log('Test response:', text);
  } catch (error) {
    console.error('\nError testing Gemini access:');
    console.error(error.message);
    
    if (error.message.includes('API key')) {
      console.log('\nPossible issues:');
      console.log('1. API key is invalid or expired');
      console.log('2. API key does not have access to Gemini 2.0 Flash');
      console.log('3. You need to enable the Gemini API in your Google Cloud Console');
    }
  }
}

testGeminiAccess(); 