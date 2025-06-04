import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    const isKeyConfigured = Boolean(groqApiKey);
    
    // Don't log the actual key for security, just whether it exists
    console.log('GROQ_API_KEY configured:', isKeyConfigured);
    console.log('GROQ_API_KEY first 4 chars:', groqApiKey ? `${groqApiKey.substring(0, 4)}...` : 'not available');
    
    // List all environment variables (without values) for debugging
    const envVars = Object.keys(process.env).sort();
    console.log('Available environment variables:', envVars);
    
    return NextResponse.json({
      isKeyConfigured,
      message: isKeyConfigured 
        ? 'GROQ_API_KEY is configured' 
        : 'GROQ_API_KEY is not configured. Make sure you have created a .env.local file with GROQ_API_KEY=your_key'
    });
  } catch (error) {
    console.error('Error in test-env API route:', error);
    return NextResponse.json(
      { error: 'Failed to check environment' },
      { status: 500 }
    );
  }
} 