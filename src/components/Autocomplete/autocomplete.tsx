'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
export interface CompletionSuggestion {
  id: string;
  text: string;
}

export interface WordAutocompleteProps {
  aiApiEndpoint?: string;
  placeholder?: string;
  minCharsForAISuggestion?: number;
  maxSuggestions?: number;
  debounceDelayMs?: number;
  inputClassName?: string;
  dropdownClassName?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  containerClassName?: string;
}

const createSafeId = (prefix: string, text: string): string => {
  const sanitizedText = text.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/\s+/g, '-');
  return `${prefix}-${Date.now()}-${sanitizedText}`; 
};


const WordAutocomplete: React.FC<WordAutocompleteProps> = ({
  aiApiEndpoint = '/api/ai-autocomplete',
  placeholder = 'Start typing...',
  minCharsForAISuggestion = 3,
  maxSuggestions = 5,
  debounceDelayMs = 500,
  containerClassName = 'relative w-full',
  inputClassName = 'w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  dropdownClassName = 'absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto',
  itemClassName = 'px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 cursor-pointer',
  activeItemClassName = 'bg-blue-500 text-white hover:bg-blue-600',
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CompletionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For loading state
  const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<F>): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const fetchAISuggestions = useCallback(
    async (currentQuery: string) => {
      if (currentQuery.length < minCharsForAISuggestion) {
        setSuggestions([]);
        setIsDropdownVisible(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(aiApiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: currentQuery }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data: { suggestions: string[] } = await response.json();
        const aiSugs = (data.suggestions || [])
            .map(text => ({ id: createSafeId('ai', text), text }))
            .slice(0, maxSuggestions);

        setSuggestions(aiSugs);
        setIsDropdownVisible(aiSugs.length > 0);
        setActiveIndex(-1);

      } catch (error) {
        console.error('Failed to fetch AI suggestions:', error);
        setSuggestions([]);
        setIsDropdownVisible(false);
      } finally {
        setIsLoading(false);
      }
    },
    [aiApiEndpoint, minCharsForAISuggestion, maxSuggestions]
  );

  const debouncedFetchAISuggestions = useCallback(
    debounce(fetchAISuggestions, debounceDelayMs),
    [fetchAISuggestions, debounceDelayMs]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newText = event.target.value;
    setInputValue(newText);
    if (!newText.trim() || newText.length < minCharsForAISuggestion) {
      setSuggestions([]);
      setIsDropdownVisible(false);
      setIsLoading(false);
    } else {
      debouncedFetchAISuggestions(newText);
    }
  };

  const handleItemClick = (suggestion: CompletionSuggestion) => {
    const wordsInInput = inputValue.split(/\s+/);
    const currentPartialWord = wordsInInput[wordsInInput.length -1];
    let newText = suggestion.text;
    if (!suggestion.text.includes(' ') && inputValue.endsWith(currentPartialWord) && !inputValue.endsWith(' ')) {
        const prefix = inputValue.substring(0, inputValue.length - currentPartialWord.length);
        newText = prefix + suggestion.text + ' ';
    } else {
        newText = suggestion.text + ' ';
    }


    setInputValue(newText);
    setSuggestions([]);
    setIsDropdownVisible(false);
    setActiveIndex(-1);
    searchInputRef.current?.focus();

    setTimeout(() => {
        if (searchInputRef.current) {
            searchInputRef.current.selectionStart = searchInputRef.current.selectionEnd = newText.length;
        }
    }, 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownVisible || suggestions.length === 0) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsDropdownVisible(false);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((prevIndex) => (prevIndex + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((prevIndex) => (prevIndex - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          event.preventDefault();
          handleItemClick(suggestions[activeIndex]);
        } else {
          setIsDropdownVisible(false);
          setActiveIndex(-1);
        }
        break;
      case 'Tab':
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          event.preventDefault();
          handleItemClick(suggestions[activeIndex]);
        } else {
          setIsDropdownVisible(false);
          setActiveIndex(-1);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsDropdownVisible(false);
        setActiveIndex(-1);
        break;
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current && suggestions[activeIndex]) {
      const activeElementId = suggestions[activeIndex].id;
      const activeElement = dropdownRef.current.querySelector(`#${CSS.escape(activeElementId)}`);
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current && !searchInputRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={containerClassName}>
      <input
        type="text"
        ref={searchInputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
            if (inputValue.trim() && inputValue.length >= minCharsForAISuggestion && suggestions.length > 0) {
                setIsDropdownVisible(true);
            } else if (inputValue.trim() && inputValue.length >= minCharsForAISuggestion) {
                debouncedFetchAISuggestions(inputValue);
            }
        }}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isDropdownVisible && suggestions.length > 0}
        aria-busy={isLoading}
        aria-controls="ai-suggestions-listbox"
        aria-activedescendant={activeIndex >= 0 && suggestions[activeIndex] ? suggestions[activeIndex].id : undefined}
      />
      {isLoading && <div className="p-2 text-xs text-gray-500">Loading suggestions...</div>}
      {isDropdownVisible && !isLoading && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          id="ai-suggestions-listbox"
          className={dropdownClassName}
          role="listbox"
          aria-label="AI-powered suggestions"
        >
          {suggestions.map((item, index) => (
            <div
              key={item.id}
              id={item.id}
              className={`${itemClassName} ${index === activeIndex ? activeItemClassName : ''}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}
       {isDropdownVisible && !isLoading && suggestions.length === 0 && inputValue.length >= minCharsForAISuggestion && (
        <div className={`${dropdownClassName} ${itemClassName} text-gray-500 italic`}>
            No suggestions found.
        </div>
      )}
    </div>
  );
};

export default WordAutocomplete;