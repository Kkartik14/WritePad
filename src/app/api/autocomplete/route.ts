import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('Autocomplete API called');
    const { text } = await request.json();
    console.log('Request text:', text);

    if (!text) {
      console.log('No text provided in request');
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get API key
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('GROQ_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Setup the prompt for sentence/word completion
    const prompt = `Complete the following text with a brief, natural continuation (max 10 words):
"${text}"

Provide only the continuation text without quotes or explanation. Be concise.`;

    console.log('Calling Groq API...');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful autocomplete assistant. Provide brief, natural continuations of text. Respond only with the completion text, no explanations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 30,
        top_p: 1,
        frequency_penalty: 0.2,
        presence_penalty: 0.0
      })
    });

    console.log('Groq API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: { message: 'Failed to parse error response' } };
      }
      
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to generate completion' },
        { status: response.status }
      );
    }

    const responseText = await response.text();
    console.log('Raw Groq API response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed Groq API response:', data);
    } catch (e) {
      console.error('Failed to parse Groq API response:', e);
      return NextResponse.json(
        { error: 'Invalid response from Groq API' },
        { status: 500 }
      );
    }
    
    const completion = data.choices[0]?.message?.content?.trim() || '';
    console.log('Extracted completion:', completion);

    // Clean up any quotation marks the LLM might have added
    const cleanedCompletion = completion.replace(/^["']|["']$/g, '');
    console.log('Cleaned completion:', cleanedCompletion);

    return NextResponse.json({ completion: cleanedCompletion });
  } catch (error) {
    console.error('Error in autocomplete API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 