package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

// --- Types ---

type GenerateTemplateRequest struct {
	Prompt       string `json:"prompt"`
	TemplateType string `json:"templateType"`
}

type GenerateTemplateResponse struct {
	Template string `json:"template"`
	Error    string `json:"error,omitempty"`
}

type AutocompleteRequest struct {
	Text string `json:"text"`
}

type AutocompleteResponse struct {
	Completion string `json:"completion"`
	Error      string `json:"error,omitempty"`
}

// Groq API Request Structure
type GroqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GroqRequest struct {
	Model            string        `json:"model"`
	Messages         []GroqMessage `json:"messages"`
	Temperature      float64       `json:"temperature"`
	MaxTokens        int           `json:"max_tokens"`
	TopP             float64       `json:"top_p,omitempty"`
	FrequencyPenalty float64       `json:"frequency_penalty,omitempty"`
	PresencePenalty  float64       `json:"presence_penalty,omitempty"`
}

// Groq API Response Structure
type GroqChoice struct {
	Message struct {
		Content string `json:"content"`
	} `json:"message"`
}

type GroqResponse struct {
	Choices []GroqChoice `json:"choices"`
	Error   struct {
		Message string `json:"message"`
	} `json:"error"`
}

// --- Handlers ---

func GenerateTemplateHandler(w http.ResponseWriter, r *http.Request) {
	var req GenerateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Prompt == "" {
		json.NewEncoder(w).Encode(GenerateTemplateResponse{Error: "Prompt is required"})
		return
	}

	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		http.Error(w, "API key not configured", http.StatusInternalServerError)
		return
	}

	// Construct System Prompt
	systemPrompt := `You are an expert document template generator for a rich text editor application. 
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

The template should be immediately usable and editable in a TipTap-based rich text editor.`

	// Add specific requirements based on template type
	switch req.TemplateType {
	case "academic":
		systemPrompt += `
SPECIFIC ACADEMIC PAPER REQUIREMENTS:
- Include proper sections: Abstract, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion
- Add placeholders for citations and references
- Include appropriate figure and table structures with captions
- Use academic formatting conventions`
	case "business":
		systemPrompt += `
SPECIFIC BUSINESS DOCUMENT REQUIREMENTS:
- Focus on executive-friendly formatting with concise sections
- Include data presentation sections with tables/charts
- Add clear action items and next steps sections
- Use professional business terminology in placeholders`
	case "creative":
		systemPrompt += `
SPECIFIC CREATIVE WRITING REQUIREMENTS:
- Include structural elements appropriate for the creative format (chapters, scenes, stanzas)
- Add placeholders for character descriptions, settings, and plot points
- Structure with appropriate creative flow
- Include stylistic elements like dialogues, descriptive passages`
	case "technical":
		systemPrompt += `
SPECIFIC TECHNICAL DOCUMENT REQUIREMENTS:
- Include proper sections for specifications, requirements, implementation
- Add code block examples where appropriate using <pre><code> tags
- Create proper tables for technical data
- Include diagrams placeholders for system architecture, flowcharts, etc.`
	}

	// Call Groq API
	groqReq := GroqRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []GroqMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: req.Prompt},
		},
		Temperature: 0.7,
		MaxTokens:   4000,
	}

	templateContent, err := callGroqAPI(apiKey, groqReq)
	if err != nil {
		log.Printf("Groq API error: %v", err)
		http.Error(w, "Failed to generate template", http.StatusInternalServerError)
		return
	}

	// Clean up the template
	templateContent = cleanTemplate(templateContent)
	templateContent = ensureTipTapCompatibility(templateContent)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GenerateTemplateResponse{Template: templateContent})
}

func AutocompleteHandler(w http.ResponseWriter, r *http.Request) {
	var req AutocompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Text == "" {
		json.NewEncoder(w).Encode(AutocompleteResponse{Error: "Text is required"})
		return
	}

	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		http.Error(w, "API key not configured", http.StatusInternalServerError)
		return
	}

	prompt := fmt.Sprintf(`Complete the following text with a brief, natural continuation (max 10 words):
"%s"

Provide only the continuation text without quotes or explanation. Be concise.`, req.Text)

	groqReq := GroqRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []GroqMessage{
			{Role: "system", Content: "You are a helpful autocomplete assistant. Provide brief, natural continuations of text. Respond only with the completion text, no explanations."},
			{Role: "user", Content: prompt},
		},
		Temperature:      0.4,
		MaxTokens:        30,
		TopP:             1,
		FrequencyPenalty: 0.2,
		PresencePenalty:  0.0,
	}

	completion, err := callGroqAPI(apiKey, groqReq)
	if err != nil {
		log.Printf("Groq API error: %v", err)
		http.Error(w, "Failed to generate completion", http.StatusInternalServerError)
		return
	}

	// Clean up quotes
	completion = strings.Trim(completion, `"'`)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AutocompleteResponse{Completion: completion})
}

// --- Helper Functions ---

func callGroqAPI(apiKey string, req GroqRequest) (string, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	client := &http.Client{}
	httpReq, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var groqResp GroqResponse
	if err := json.Unmarshal(body, &groqResp); err != nil {
		return "", err
	}

	if len(groqResp.Choices) > 0 {
		return groqResp.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("no choices in response")
}

func cleanTemplate(template string) string {
	// Remove markdown code blocks
	template = strings.ReplaceAll(template, "```html", "")
	template = strings.ReplaceAll(template, "```", "")
	return strings.TrimSpace(template)
}

func ensureTipTapCompatibility(html string) string {
	// Simple replacements to match the TS version logic
	// In a real Go app, you might use a proper HTML parser like net/html or goquery
	// But regex is "good enough" for this specific cleanup task as per the original TS code

	// Note: Go's regex engine is RE2 and doesn't support backreferences in replacement strings exactly like JS
	// So we'll do some simple string replacements for now.

	html = strings.ReplaceAll(html, "’", "'")
	html = strings.ReplaceAll(html, "“", "\"")
	html = strings.ReplaceAll(html, "”", "\"")
	html = strings.ReplaceAll(html, "—", "--")
	html = strings.ReplaceAll(html, "–", "-")

	return html
}
