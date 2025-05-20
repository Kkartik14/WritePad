import { NextResponse } from 'next/server';

type TemplateType = 'standard' | 'academic' | 'business' | 'creative' | 'technical';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt;
    const templateType = (body.templateType as TemplateType) || 'standard';

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

    let systemPrompt = `You are an expert document template generator for a rich text editor application. 
Your task is to create high-quality, well-structured document templates based on user requests.

IMPORTANT GUIDELINES:
1. Generate templates in clean HTML with proper TipTap editor compatibility.
2. Create professional, ready-to-use templates with clear section demarcation.
3. Include descriptive placeholder text enclosed in [BRACKETS] to guide users where to input their information.
4. Make the template comprehensive but concise, with just enough detail to be useful.
5. Use proper semantic HTML elements: <h1>, <h2>, <h3> for headings, <p> for paragraphs, <ul>/<ol> for lists, etc.

FEATURES TO INCLUDE BASED ON DOCUMENT TYPE:
- Proper headings and subheadings with logical hierarchy
- Appropriate sections based on document type (e.g., Executive Summary, Background, Methodology)
- Lists (ordered/unordered) when appropriate
- Sample table structures for data presentation (use <table>, <tr>, <td> elements)
- Image placeholders using <img> tags with src="https://placehold.co/600x400/png" or similar
- Blockquotes for highlighted information
- Code blocks if technically relevant

FOR FIGURES AND VISUAL ELEMENTS:
- Create proper HTML for figure elements: <figure> with <figcaption>
- Include image placeholders for diagrams, charts, or photos as appropriate
- Add descriptive captions for all figures

TEMPLATE STRUCTURE:
1. Always start with a clear title/header section
2. Include a logical flow of sections appropriate to the document type
3. End with the appropriate conclusion, next steps, or contact sections

IMPORTANT: Output ONLY the HTML template without explanations, comments outside HTML, or markdown backticks.

The template should be immediately usable and editable in a TipTap-based rich text editor.`;

    // Specialized additions to system prompt based on template type
    const templateAdditions: Record<TemplateType, string> = {
      standard: '',
      academic: `
SPECIFIC ACADEMIC PAPER REQUIREMENTS:
- Include proper sections: Abstract, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion
- Add placeholders for citations and references
- Include appropriate figure and table structures with captions
- Use academic formatting conventions`,
      business: `
SPECIFIC BUSINESS DOCUMENT REQUIREMENTS:
- Focus on executive-friendly formatting with concise sections
- Include data presentation sections with tables/charts
- Add clear action items and next steps sections
- Use professional business terminology in placeholders`,
      creative: `
SPECIFIC CREATIVE WRITING REQUIREMENTS:
- Include structural elements appropriate for the creative format (chapters, scenes, stanzas)
- Add placeholders for character descriptions, settings, and plot points
- Structure with appropriate creative flow
- Include stylistic elements like dialogues, descriptive passages`,
      technical: `
SPECIFIC TECHNICAL DOCUMENT REQUIREMENTS:
- Include proper sections for specifications, requirements, implementation
- Add code block examples where appropriate using <pre><code> tags
- Create proper tables for technical data
- Include diagrams placeholders for system architecture, flowcharts, etc.`
    };

    // Add template-specific guidance if a special type is requested
    if (templateType in templateAdditions) {
      systemPrompt += templateAdditions[templateType];
    }

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
          max_tokens: 4000
        })
      });

      console.log('Groq API response status:', response.status);
      
      // Try to get the response body regardless of status to see error details
      const responseText = await response.text();
      console.log('Groq API response body (truncated):', responseText.substring(0, 200) + '...');
      
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
        
        // Clean up any HTML comments that might be included
        template = template.replace(/<!--[\s\S]*?-->/g, '');
        
        // Process template to ensure proper TipTap compatibility
        template = ensureTipTapCompatibility(template);
        
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

/**
 * Ensures the template is compatible with TipTap editor
 */
function ensureTipTapCompatibility(html: string): string {
  // Replace self-closing tags with proper opening and closing tags
  html = html.replace(/<(hr|br|img)([^>]*)\/>/g, '<$1$2></$1>');
  
  // Ensure image tags have alt attributes
  html = html.replace(/<img([^>]*)>/g, (match: string, attributes: string) => {
    if (!attributes.includes('alt=')) {
      return match.replace('>', ' alt="Image placeholder">');
    }
    return match;
  });
  
  // Replace any possible Unicode characters that might cause issues
  html = html.replace(/[\u2018\u2019]/g, "'"); // Smart quotes (single)
  html = html.replace(/[\u201C\u201D]/g, '"'); // Smart quotes (double)
  html = html.replace(/\u2014/g, '--'); // Em dash
  html = html.replace(/\u2013/g, '-'); // En dash
  
  // Ensure all tags are properly closed
  const openingTags = html.match(/<([a-z][a-z0-9]*)[^>]*>/gi) || [];
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
  
  for (const tag of openingTags) {
    const tagMatch = tag.match(/<([a-z][a-z0-9]*)/i);
    if (tagMatch) {
      const tagName = tagMatch[1].toLowerCase();
      if (!selfClosingTags.includes(tagName)) {
        const closingTag = `</${tagName}>`;
        if (html.indexOf(closingTag) === -1) {
          html += closingTag;
        }
      }
    }
  }
  
  return html;
} 