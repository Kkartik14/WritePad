package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Request/Response structures
type GenerateTemplateRequest struct {
	Prompt       string `json:"prompt"`
	TemplateType string `json:"templateType"` // e.g., "blog-post", "meeting-notes", "project-plan"
}

type GenerateTemplateResponse struct {
	Template string `json:"template,omitempty"`
	Error    string `json:"error,omitempty"`
}

type AutocompleteRequest struct {
	Text string `json:"text"`
}

type AutocompleteResponse struct {
	Suggestion string `json:"suggestion,omitempty"`
	Error      string `json:"error,omitempty"`
}

// Groq API structures
type GroqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GroqRequest struct {
	Messages    []GroqMessage `json:"messages"`
	Model       string        `json:"model"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
}

type GroqChoice struct {
	Message GroqMessage `json:"message"`
}

type GroqResponse struct {
	Choices []GroqChoice `json:"choices"`
	Error   interface{}  `json:"error,omitempty"`
}

// GenerateTemplateHandler handles AI template generation
func GenerateTemplateHandler(w http.ResponseWriter, r *http.Request) {
	var req GenerateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Prompt == "" {
		http.Error(w, "Prompt is required", http.StatusBadRequest)
		if err := json.NewEncoder(w).Encode(GenerateTemplateResponse{Error: "Prompt is required"}); err != nil {
			log.Printf("[WARN] Failed to write response: %v", err)
		}
		return
	}

	// Call Groq API
	templateContent, err := callGroqAPI(req.Prompt, req.TemplateType, "template")
	if err != nil {
		log.Printf("Error calling Groq API: %v", err)
		http.Error(w, "Failed to generate template", http.StatusInternalServerError)
		if err := json.NewEncoder(w).Encode(GenerateTemplateResponse{Error: err.Error()}); err != nil {
			log.Printf("[WARN] Failed to write response: %v", err)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(GenerateTemplateResponse{Template: templateContent}); err != nil {
		log.Printf("[WARN] Failed to write response: %v", err)
	}
}

// AutocompleteHandler handles AI text completion
func AutocompleteHandler(w http.ResponseWriter, r *http.Request) {
	var req AutocompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Text == "" {
		http.Error(w, "Text is required", http.StatusBadRequest)
		if err := json.NewEncoder(w).Encode(AutocompleteResponse{Error: "Text is required"}); err != nil {
			log.Printf("[WARN] Failed to write response: %v", err)
		}
		return
	}

	// Call Groq API
	suggestion, err := callGroqAPI(req.Text, "", "autocomplete")
	if err != nil {
		log.Printf("Error calling Groq API: %v", err)
		http.Error(w, "Failed to generate suggestion", http.StatusInternalServerError)
		if err := json.NewEncoder(w).Encode(AutocompleteResponse{Error: err.Error()}); err != nil {
			log.Printf("[WARN] Failed to write response: %v", err)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(AutocompleteResponse{Suggestion: suggestion}); err != nil {
		log.Printf("[WARN] Failed to write response: %v", err)
	}
}

func callGroqAPI(input, contextType, mode string) (string, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		// Try loading from .env if not set
		_ = godotenv.Load()
		apiKey = os.Getenv("GROQ_API_KEY")
		if apiKey == "" {
			return "", fmt.Errorf("GROQ_API_KEY not set")
		}
	}

	var systemPrompt string
	var userPrompt string

	if mode == "template" {
		systemPrompt = "You are a helpful AI assistant that generates document templates. Output ONLY the markdown content for the template. Do not include any conversational text."
		userPrompt = fmt.Sprintf("Create a %s template based on this description: %s", contextType, input)
	} else {
		systemPrompt = "You are a helpful AI writing assistant. Complete the following text naturally. Output ONLY the completion text."
		userPrompt = fmt.Sprintf("Complete this text: %s", input)
	}

	groqReq := GroqRequest{
		Messages: []GroqMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Model:       "llama-3.3-70b-versatile",
		Temperature: 0.7,
		MaxTokens:   1024,
	}

	reqBody, err := json.Marshal(groqReq)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", strings.NewReader(string(reqBody)))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			log.Printf("[WARN] Failed to close response body: %v", err)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("groq API returned status: %s", resp.Status)
	}

	var groqResp GroqResponse
	if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
		return "", err
	}

	if len(groqResp.Choices) > 0 {
		content := groqResp.Choices[0].Message.Content
		// Clean up markdown code blocks if present
		content = strings.TrimPrefix(content, "```markdown")
		content = strings.TrimPrefix(content, "```")
		content = strings.TrimSuffix(content, "```")
		return strings.TrimSpace(content), nil
	}

	return "", fmt.Errorf("no response from Groq API")
}
