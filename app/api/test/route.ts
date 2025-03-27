import { NextResponse } from 'next/server';
import { testOpenAIKey } from '../../../lib/test-api';

export async function GET() {
  try {
    console.log('Starting API key test...');
    const isWorking = await testOpenAIKey();
    
    if (isWorking) {
      return NextResponse.json({ 
        status: 'success', 
        message: 'API key is working correctly' 
      });
    } else {
      return NextResponse.json({ 
        status: 'error', 
        message: 'API key test failed. Check server logs for details.' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error testing API key:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        cause: error.cause,
        stack: error.stack
      } : error,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? {
        name: error.name,
        cause: error.cause
      } : undefined
    }, { status: 500 });
  }
} 