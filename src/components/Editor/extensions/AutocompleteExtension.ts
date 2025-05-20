import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface AutocompleteOptions {
  enabled: boolean;
}

// Cache for completions to reduce API calls
const completionCache: Map<string, { completion: string; timestamp: number }> = new Map();
const CACHE_EXPIRY = 60000; // 1 minute cache expiry

// Storage for pending completions
const pendingCompletions: Map<string, boolean> = new Map();
// Storage for current completions
const currentCompletions: Map<string, string> = new Map();

// Simple debounce implementation
let debounceTimeout: NodeJS.Timeout | null = null;

// Helper function to dispatch debug messages to the UI
function dispatchDebugMessage(message: string) {
  document.dispatchEvent(new CustomEvent('autocomplete-debug', { 
    detail: message 
  }));
}

// Get LLM-powered completion
async function getLLMCompletion(text: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = completionCache.get(text);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      console.log('Using cached completion for:', text);
      return cached.completion;
    }

    // Skip very short texts or texts ending with whitespace
    if (text.length < 5 || /\s$/.test(text)) {
      console.log('Text too short or ends with whitespace, skipping:', text);
      return null;
    }

    console.log('Fetching API completion for:', text);
    const response = await fetch('/api/autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.error('Error response from API:', response.status);
      console.error('Error getting LLM completion:', await response.text());
      return null;
    }

    const data = await response.json();
    const completion = data.completion;
    console.log('API returned completion:', completion);

    // Store in cache
    completionCache.set(text, {
      completion,
      timestamp: Date.now(),
    });

    return completion;
  } catch (error) {
    console.error('Error fetching LLM completion:', error);
    return null;
  }
}

// Function to request completions asynchronously and store them
function requestCompletion(text: string): void {
  console.log('Requesting completion for:', text);
  
  // Don't make duplicate requests
  if (pendingCompletions.get(text)) {
    console.log('Already pending request for this text, skipping');
    return;
  }
  
  // Mark this text as having a pending completion
  pendingCompletions.set(text, true);
  dispatchDebugMessage('Waiting for AI suggestion...');
  
  // Clear previous timeout if it exists
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  
  // Set new timeout - reduced from 300ms to 200ms for quicker response
  debounceTimeout = setTimeout(async () => {
    try {
      console.log('Making API call for:', text);
      dispatchDebugMessage('Loading suggestion...');
      
      // Get the completion from the API
      const completion = await getLLMCompletion(text);
      console.log('Received completion:', completion);
      
      // Store it if we got a valid result
      if (completion) {
        currentCompletions.set(text, completion);
        console.log('Stored completion for later use');
        dispatchDebugMessage('Suggestion ready!');
        
        // Force a view update to show the suggestion
        document.dispatchEvent(new CustomEvent('force-editor-update'));
      } else {
        // If API returned nothing, try to provide a simple fallback suggestion
        const fallbackSuggestion = getFallbackSuggestion(text);
        if (fallbackSuggestion) {
          currentCompletions.set(text, fallbackSuggestion);
          console.log('Using fallback suggestion:', fallbackSuggestion);
          dispatchDebugMessage('Basic suggestion ready');
          document.dispatchEvent(new CustomEvent('force-editor-update'));
        } else {
          dispatchDebugMessage('No suggestion found');
        }
      }
    } catch (error) {
      console.error('Error in requestCompletion:', error);
      dispatchDebugMessage('Error getting suggestion');
      
      // Try fallback if API fails
      const fallbackSuggestion = getFallbackSuggestion(text);
      if (fallbackSuggestion) {
        currentCompletions.set(text, fallbackSuggestion);
        console.log('Using fallback after error:', fallbackSuggestion);
        dispatchDebugMessage('Using basic suggestion');
        document.dispatchEvent(new CustomEvent('force-editor-update'));
      }
    } finally {
      // Mark request as no longer pending
      pendingCompletions.set(text, false);
    }
  }, 200); // Reduced debounce time
}

// Simple fallback suggestion function for when API isn't working
function getFallbackSuggestion(text: string): string | null {
  const completions: Record<string, string[]> = {
    'I am ': ['working on', 'thinking about', 'planning to', 'excited to'],
    'The project ': ['is almost complete', 'requires more time', 'will be finished by'],
    'We need to ': ['discuss this further', 'complete the task', 'plan our next steps'],
    'Please ': ['let me know', 'review this document', 'provide feedback'],
    'Thank you ': ['for your help', 'for your time', 'for considering'],
    'I would like to ': ['schedule a meeting', 'discuss this topic', 'ask a question'],
    'In conclusion': [', we should proceed with', ', the results show', ', I recommend'],
  };

  // Find a matching beginning
  for (const [beginning, suggestions] of Object.entries(completions)) {
    if (text.endsWith(beginning)) {
      const randomIndex = Math.floor(Math.random() * suggestions.length);
      return suggestions[randomIndex];
    }
  }

  // Common word completions
  const commonWordEndings: Record<string, string[]> = {
    'imp': ['ortant', 'lementation', 'rove'],
    'pro': ['ject', 'gram', 'cess', 'vide'],
    'dev': ['elopment', 'elop', 'ice'],
    'com': ['plete', 'munication', 'pany'],
  };

  // Check if the last word matches any of our prefixes
  const lastWord = text.split(/\s+/).pop() || '';
  for (const [prefix, endings] of Object.entries(commonWordEndings)) {
    if (lastWord === prefix) {
      const randomIndex = Math.floor(Math.random() * endings.length);
      return endings[randomIndex];
    }
  }

  return null;
}

export const AutocompleteExtension = Extension.create<AutocompleteOptions>({
  name: 'autocomplete',

  addOptions() {
    return {
      enabled: false,
    };
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autocomplete'),
        state: {
          init() {
            return { suggestion: null };
          },
          apply(tr, prev) {
            const meta = tr.getMeta('autocomplete');
            if (meta) {
              return meta;
            }
            return prev;
          },
        },
        props: {
          // We'll handle key press events for Space to accept suggestions
          handleKeyDown: (view, event) => {
            // Check storage for enabled state instead of options
            const isEnabled = this.editor?.storage.autocomplete?.enabled ?? false;
            
            if (!isEnabled) {
              console.log('Autocomplete is disabled in storage, ignoring key press');
              return false;
            }
            
            console.log('Key pressed:', event.key, 'Autocomplete enabled from storage:', isEnabled);
            
            if (event.key === ' ' && view.state.tr.getMeta('autocomplete')) {
              console.log('Space key pressed with autocomplete suggestion available');
              // Accept the suggestion
              const meta = view.state.tr.getMeta('autocomplete');
              console.log('Autocomplete meta:', meta);
              
              if (meta && meta.from && meta.to && meta.text) {
                console.log('Accepting suggestion:', meta.text);
                dispatchDebugMessage('Suggestion accepted!');
                event.preventDefault(); // Prevent the default space behavior
                
                // Create a new transaction to insert the text
                const tr = view.state.tr.insertText(meta.text + ' ', meta.from, meta.to);
                view.dispatch(tr);
                
                // Clear the suggestion after accepting it
                currentCompletions.clear();
                
                return true;
              }
            }
            return false;
          },
          decorations: (state) => {
            // Check storage for enabled state instead of options
            const isEnabled = this.editor?.storage.autocomplete?.enabled ?? false;
            
            if (!isEnabled) {
              console.log('Autocomplete is disabled in storage, not showing suggestions');
              return null;
            }
            
            console.log('Autocomplete is enabled in storage, checking for suggestions');
            
            const { doc, selection } = state;
            if (!selection.empty) {
              console.log('Selection not empty, not showing suggestions');
              return null;
            }
            
            const decorations: Decoration[] = [];
            const currentPos = selection.from;
            const currentLineStart = doc.resolve(currentPos).start();
            
            // Get the text up to the cursor
            const textBeforeCursor = doc.textBetween(currentLineStart, currentPos);
            console.log('Text before cursor:', textBeforeCursor);
            
            // Skip if less than 5 characters
            if (textBeforeCursor.length < 5) {
              console.log('Text too short, not showing suggestions');
              return null;
            }
            
            // Request a completion (non-blocking)
            requestCompletion(textBeforeCursor);
            
            // Check if we have a completion ready
            const suggestion = currentCompletions.get(textBeforeCursor);
            console.log('Current suggestion for this text:', suggestion);
            
            if (suggestion && suggestion.length > 0) {
              console.log('Adding decoration for suggestion:', suggestion);
              // Store data for the keybinding to use
              state.tr.setMeta('autocomplete', {
                from: currentPos,
                to: currentPos,
                text: suggestion
              });
              
              // Add decoration for the suggestion
              decorations.push(
                Decoration.inline(
                  currentPos,
                  currentPos,
                  {
                    class: 'autocomplete-suggestion',
                  },
                  {
                    inclusiveStart: true,
                    inclusiveEnd: true,
                  }
                )
              );
              
              // Add text decoration showing the suggestion
              decorations.push(
                Decoration.widget(currentPos, () => {
                  const span = document.createElement('span');
                  span.className = 'autocomplete-text text-white';
                  span.textContent = suggestion;
                  return span;
                })
              );
            }
            
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
}); 