import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface AutocompleteOptions {
  enabled: boolean;
  debounceMs: number;
  minTriggerLength: number;
  maxSuggestionLength: number;
}

// Cache for completions to reduce API calls
const completionCache = new Map<string, { completion: string; timestamp: number }>();
const CACHE_EXPIRY = 300000; // 5 minutes cache expiry

// Storage for pending completions and current state
const pendingCompletions = new Set<string>();
const currentCompletions = new Map<string, string>();
const requestedCompletions = new Set<string>(); // Track what we've already requested

// Debounce handling
let debounceTimeout: NodeJS.Timeout | null = null;

// Current suggestion state
let currentSuggestionKey = '';
let currentSuggestionText = '';
let lastTextRequested = ''; // Track the last text we made a request for
let lastCursorPosition = 0; // Track cursor position to prevent unnecessary calls

// Cache variables for decorations
let lastProcessedText = '';
let lastDecorationSet: DecorationSet | null = null;

// Debug mode (can be toggled)
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) console.log('[Autocomplete]', ...args);
}

// Helper function to dispatch UI messages
function dispatchUIMessage(message: string, type: 'info' | 'success' | 'error' | 'loading' = 'info') {
  document.dispatchEvent(new CustomEvent('autocomplete-message', { 
    detail: { message, type }
  }));
}

// Enhanced completion request with better error handling and retries
async function getLLMCompletion(text: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = completionCache.get(text);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      log('Using cached completion for:', text);
      return cached.completion;
    }

    // Skip inappropriate text patterns
    if (text.length < 3 || /^\s*$/.test(text) || /\s{2,}$/.test(text)) {
      log('Skipping inappropriate text pattern:', text);
      return null;
    }

    log('Fetching API completion for:', text);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch('/api/autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      log('API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const completion = data.completion?.trim();
    
    if (!completion || completion.length > 50) {
      log('Invalid completion received:', completion);
      return null;
    }

    // Store in cache
    completionCache.set(text, {
      completion,
      timestamp: Date.now(),
    });

    log('API returned completion:', completion);
    return completion;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      log('API request timed out');
    } else {
      log('Error fetching completion:', error);
    }
    return null;
  }
}

// Intelligent fallback suggestions with context awareness
function getSmartFallbackSuggestion(text: string): string | null {
  const trimmedText = text.trim().toLowerCase();
  
  // Enhanced phrase completions
  const phraseCompletions: Record<string, string[]> = {
    'i am ': ['working on this project', 'excited to share', 'planning to implement', 'currently developing'],
    'we need to ': ['discuss this further', 'review the requirements', 'schedule a meeting', 'finalize the details'],
    'the project ': ['is progressing well', 'requires additional resources', 'will be completed by', 'has been updated'],
    'please ': ['let me know your thoughts', 'review this document', 'provide your feedback', 'confirm your availability'],
    'thank you ': ['for your assistance', 'for the opportunity', 'for your feedback', 'for your time'],
    'i would like to ': ['schedule a call', 'discuss this topic', 'review the proposal', 'share my thoughts'],
    'in order to ': ['achieve our goals', 'complete this task', 'move forward', 'ensure success'],
    'it is important to ': ['consider all options', 'review the details', 'maintain quality', 'meet the deadline'],
    'this will help ': ['improve the process', 'achieve better results', 'streamline operations', 'enhance efficiency'],
  };

  // Check phrase completions
  for (const [phrase, completions] of Object.entries(phraseCompletions)) {
    if (trimmedText.endsWith(phrase)) {
      return completions[Math.floor(Math.random() * completions.length)];
    }
  }

  // Smart word completion
  const lastWord = text.split(/\s+/).pop()?.toLowerCase() || '';
  
  const smartWordCompletions: Record<string, string[]> = {
    'imp': ['ortant consideration', 'lementation details', 'rovement suggestions'],
    'dev': ['elopment process', 'eloping solutions', 'ice configuration'],
    'pro': ['ject timeline', 'cess improvement', 'vide assistance', 'gram development'],
    'com': ['plete the task', 'munication strategy', 'pare different options'],
    'res': ['ources allocation', 'ults analysis', 'earch findings'],
    'man': ['agement approach', 'ual documentation', 'y different options'],
    'sys': ['tem architecture', 'tematic approach', 'tem requirements'],
    'app': ['lication design', 'roach methodology', 'lied correctly'],
    'user': [' experience design', ' interface improvements', ' requirements analysis'],
    'data': [' analysis results', ' processing pipeline', ' security measures'],
  };

  for (const [prefix, completions] of Object.entries(smartWordCompletions)) {
    if (lastWord.startsWith(prefix) && lastWord.length >= 3) {
      return completions[Math.floor(Math.random() * completions.length)];
    }
  }

  // Context-aware suggestions based on document patterns
  if (text.includes('meeting') || text.includes('schedule')) {
    return 'at your earliest convenience';
  }
  
  if (text.includes('review') || text.includes('feedback')) {
    return 'would be greatly appreciated';
  }
  
  if (text.includes('project') || text.includes('development')) {
    return 'is moving forward as planned';
  }

  return null;
}

// Optimized completion request with better debouncing
function requestCompletion(text: string): void {
  const textKey = text.trim();
  
  // Don't make requests for very short text
  if (textKey.length < 5) {
    log('Text too short for completion:', textKey);
    return;
  }
  
  // Don't make requests if we already have a completion or are pending
  if (currentCompletions.has(textKey) || pendingCompletions.has(textKey)) {
    log('Already have completion or pending request for:', textKey);
    return;
  }
  
  // Don't make repeated requests for the same text
  if (lastTextRequested === textKey) {
    log('Already requested completion for this exact text:', textKey);
    return;
  }
  
  // Clear previous timeout
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  
  // Much longer debounce to prevent spam - 1 second
  debounceTimeout = setTimeout(async () => {
    // Triple-check we don't already have this completion
    if (currentCompletions.has(textKey) || pendingCompletions.has(textKey)) {
      log('Completion appeared while waiting, skipping request for:', textKey);
      return;
    }
    
    // Check if text is still the same (user might have continued typing)
    if (lastTextRequested !== textKey) {
      lastTextRequested = textKey; // Mark as requested
    }
    
    pendingCompletions.add(textKey);
    dispatchUIMessage('Getting AI suggestion...', 'loading');
    
    try {
      log('Making API call for:', textKey);
      
      // Try API first
      let completion = await getLLMCompletion(textKey);
      
      // Fall back to smart suggestions if API fails
      if (!completion) {
        completion = getSmartFallbackSuggestion(textKey);
        if (completion) {
          log('Using smart fallback:', completion);
          dispatchUIMessage('Smart suggestion ready', 'info');
        } else {
          dispatchUIMessage('No suggestion available', 'info');
        }
      } else {
        dispatchUIMessage('AI suggestion ready', 'success');
      }
      
      // Store the completion
      if (completion) {
        currentCompletions.set(textKey, completion);
        
        // Only update current suggestion if this is still the active text
        if (textKey === lastTextRequested) {
          currentSuggestionKey = textKey;
          currentSuggestionText = completion;
          
          // Trigger UI update
          document.dispatchEvent(new CustomEvent('autocomplete-update'));
        }
      }
      
    } catch (error) {
      log('Error in requestCompletion:', error);
      dispatchUIMessage('Error getting suggestion', 'error');
      
      // Try fallback even on error
      const fallback = getSmartFallbackSuggestion(textKey);
      if (fallback) {
        currentCompletions.set(textKey, fallback);
        
        if (textKey === lastTextRequested) {
          currentSuggestionKey = textKey;
          currentSuggestionText = fallback;
          dispatchUIMessage('Using fallback suggestion', 'info');
          document.dispatchEvent(new CustomEvent('autocomplete-update'));
        }
      }
    } finally {
      pendingCompletions.delete(textKey);
    }
  }, 1000); // 1 second debounce to prevent spam
}

// Clear current suggestion
function clearCurrentSuggestion() {
  log('Clearing current suggestion');
  currentSuggestionKey = '';
  currentSuggestionText = '';
  lastTextRequested = ''; // Reset this too
  lastCursorPosition = 0; // Reset cursor tracking
  currentCompletions.clear();
  requestedCompletions.clear();
  
  // Clear any pending timeouts
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }
  
  // Trigger an update to clear any stale decorations
  document.dispatchEvent(new CustomEvent('autocomplete-update'));
}

export const AutocompleteExtension = Extension.create<AutocompleteOptions>({
  name: 'autocomplete',

  addOptions() {
    return {
      enabled: false,
      debounceMs: 250,
      minTriggerLength: 3,
      maxSuggestionLength: 50,
    };
  },

  addStorage() {
    return {
      enabled: this.options.enabled,
      currentSuggestion: null,
    };
  },

  onCreate() {
    // Listen for update events
    const handleUpdate = () => {
      if (this.editor?.view) {
        log('Forcing editor update and clearing caches');
        // Clear caches to force fresh decorations
        lastProcessedText = '';
        lastDecorationSet = null;
        this.editor.view.updateState(this.editor.view.state);
      }
    };

    document.addEventListener('autocomplete-update', handleUpdate);
    
    // Cleanup on destroy
    this.editor?.on('destroy', () => {
      document.removeEventListener('autocomplete-update', handleUpdate);
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    });
  },

  addKeyboardShortcuts() {
    return {
      // Tab key to accept suggestion
      Tab: ({ editor }) => {
        // Check enabled state from editor storage, not this.storage
        const isEnabled = editor?.storage?.autocomplete?.enabled ?? false;
        log('Tab key pressed. Enabled:', isEnabled, 'Current suggestion:', currentSuggestionText);
        
        if (!isEnabled) {
          log('Autocomplete not enabled, allowing normal Tab behavior');
          return false;
        }
        
        if (!currentSuggestionText || currentSuggestionText.trim() === '') {
          log('No current suggestion available, allowing normal Tab behavior');
          return false;
        }

        log('Tab pressed - accepting suggestion:', currentSuggestionText);
        
        try {
          const { view } = editor;
          const { state } = view;
          const { selection } = state;
          
          if (selection.empty) {
            // Insert the suggestion text at the current cursor position
            const transaction = state.tr.insertText(currentSuggestionText, selection.from);
            view.dispatch(transaction);
            
            // Clear the suggestion after accepting it
            clearCurrentSuggestion();
            dispatchUIMessage('Suggestion accepted!', 'success');
            
            log('Suggestion successfully accepted and inserted');
            
            // Return true to prevent default Tab behavior
            return true;
          } else {
            log('Selection not empty, allowing normal Tab behavior');
            return false;
          }
        } catch (error) {
          log('Error accepting suggestion:', error);
          dispatchUIMessage('Error accepting suggestion', 'error');
          return false;
        }
      },
      
      // Escape to dismiss suggestion  
      Escape: ({ editor }) => {
        if (currentSuggestionText && currentSuggestionText.trim() !== '') {
          log('Escape pressed - dismissing suggestion:', currentSuggestionText);
          clearCurrentSuggestion();
          dispatchUIMessage('Suggestion dismissed', 'info');
          
          // Force update the view to remove the suggestion immediately
          editor.view.updateState(editor.view.state);
          
          // Return true to prevent default Escape behavior
          return true;
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const pluginKey = new PluginKey('autocomplete');
    
    return [
      new Plugin({
        key: pluginKey,
        
        state: {
          init() {
            return { 
              suggestion: null,
              enabled: false,
            };
          },
          
          apply(tr, prev) {
            const meta = tr.getMeta(pluginKey);
            if (meta) {
              return { ...prev, ...meta };
            }
            return prev;
          },
        },

        props: {
          decorations: (state) => {
            // Check if autocomplete is enabled
            const isEnabled = editor?.storage?.autocomplete?.enabled ?? false;
            
            if (!isEnabled) {
              lastProcessedText = '';
              lastDecorationSet = null;
              return DecorationSet.empty;
            }
            
            const { doc, selection } = state;
            
            // Only show suggestions at empty cursor positions
            if (!selection.empty) {
              lastProcessedText = '';
              lastDecorationSet = null;
              return DecorationSet.empty;
            }
            
            const currentPos = selection.from;
            
            // Get text context around cursor
            const $pos = doc.resolve(currentPos);
            const start = $pos.start($pos.depth);
            const textBeforeCursor = doc.textBetween(start, currentPos);
            const textKey = textBeforeCursor.trim();
            
            log('Decorations called for text:', textKey, 'Position:', currentPos);
            
            // Check minimum length requirement - be more reasonable for display
            if (textBeforeCursor.length < 5) {
              // Clear suggestion if text is too short
              if (currentSuggestionText) {
                log('Text too short, clearing suggestion');
                clearCurrentSuggestion();
              }
              lastDecorationSet = DecorationSet.empty;
              lastProcessedText = textKey;
              return lastDecorationSet;
            }
            
            // Check if we already have a suggestion for this text
            const existingSuggestion = currentCompletions.get(textKey);
            
            log('Existing suggestion for', textKey, ':', existingSuggestion);
            
            if (existingSuggestion) {
              log('Showing existing suggestion for:', textKey, '→', existingSuggestion);
              
              // Update the current suggestion tracking variables so Tab key works
              currentSuggestionKey = textKey;
              currentSuggestionText = existingSuggestion;
              
              // Create and return the suggestion widget
              const widget = Decoration.widget(currentPos, () => {
                const span = document.createElement('span');
                span.className = 'autocomplete-suggestion';
                span.style.cssText = `
                  color: rgba(168, 85, 247, 0.8);
                  background: rgba(168, 85, 247, 0.1);
                  padding: 2px 4px;
                  border-radius: 3px;
                  margin-left: 2px;
                  font-style: italic;
                  pointer-events: none;
                  user-select: none;
                  border: 1px solid rgba(168, 85, 247, 0.2);
                `;
                span.textContent = existingSuggestion;
                
                // Add tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'autocomplete-tooltip';
                tooltip.style.cssText = `
                  position: absolute;
                  bottom: -25px;
                  left: 0;
                  font-size: 11px;
                  color: #666;
                  background: rgba(0,0,0,0.8);
                  color: white;
                  padding: 2px 6px;
                  border-radius: 3px;
                  white-space: nowrap;
                  pointer-events: none;
                  z-index: 1000;
                `;
                tooltip.textContent = 'Tab to accept • Esc to dismiss';
                
                const container = document.createElement('span');
                container.style.position = 'relative';
                container.appendChild(span);
                container.appendChild(tooltip);
                
                return container;
              }, {
                side: 1,
                marks: [],
              });
              
              lastDecorationSet = DecorationSet.create(doc, [widget]);
              lastProcessedText = textKey;
              return lastDecorationSet;
            } else {
              // Only request completion if conditions are met - keep API requests conservative
              const shouldRequest = !pendingCompletions.has(textKey) && 
                                   lastTextRequested !== textKey &&
                                   textKey.length >= 8 &&
                                   !textKey.endsWith(' '); // Don't request if text ends with space
              
              if (shouldRequest) {
                log('Requesting new completion for:', textKey);
                requestCompletion(textBeforeCursor);
              } else {
                log('Skipping request for:', textKey, {
                  pending: pendingCompletions.has(textKey),
                  alreadyRequested: lastTextRequested === textKey,
                  tooShort: textKey.length < 8,
                  endsWithSpace: textKey.endsWith(' ')
                });
              }
              
              // Clear suggestion tracking if no suggestion available
              if (currentSuggestionText && currentSuggestionKey !== textKey) {
                log('Clearing outdated suggestion');
                currentSuggestionText = '';
                currentSuggestionKey = '';
              }
              
              lastDecorationSet = DecorationSet.empty;
              lastProcessedText = textKey;
              return lastDecorationSet;
            }
          },
        },
      }),
    ];
  },
}); 