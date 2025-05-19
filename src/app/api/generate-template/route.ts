import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Prepare the Groq API request
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('GROQ_API_KEY is not configured in .env.local');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    console.log('Making request to Groq API with prompt:', prompt.substring(0, 50) + '...');

    const systemPrompt = `You are a document template generator. Create a basic document template based on the user's description. 
    The output should be HTML that can be inserted into a rich text editor (compatible with TipTap). 
    Include appropriate headings, paragraphs, lists, etc. based on the requested document type. 
    The document should have places, where user can input their own data, in short placeholders.
    Keep it simple and focused on structure rather than extensive content.`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      console.log('Groq API response status:', response.status);
      
      // Try to get the response body regardless of status to see error details
      const responseText = await response.text();
      console.log('Groq API response body:', responseText);
      
      if (!response.ok) {
        let errorMessage = 'Failed to generate template';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: response.status }
        );
      }

      try {
        const data = JSON.parse(responseText);
        let template = data.choices[0]?.message?.content || '';
        
        // Remove triple backticks and language specifiers from the template
        template = template.replace(/```(html|markdown|md)?\n/g, '');
        template = template.replace(/```\s*$/g, '');
        
        return NextResponse.json({ template });
      } catch (parseError) {
        console.error('Error parsing successful response:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse API response' },
          { status: 500 }
        );
      }
    } catch (fetchError) {
      console.error('Fetch error with Groq API:', fetchError);
      return NextResponse.json(
        { error: `API request failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in generate-template API route:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 