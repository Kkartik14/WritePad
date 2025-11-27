# WritePad Go Backend

This is the backend server for WritePad, written in Go.

## Structure

- **`main.go`**: Entry point. Sets up the server, Chi router, and CORS middleware.
- **`handlers.go`**: Contains the API logic (`GenerateTemplateHandler`, `AutocompleteHandler`).

## API Endpoints

- `POST /api/generate-template`: Generates document templates using Groq AI.
- `POST /api/autocomplete`: Provides text completion using Groq AI.

## Running

```bash
go run main.go handlers.go
```

Server runs on port `8080`.
