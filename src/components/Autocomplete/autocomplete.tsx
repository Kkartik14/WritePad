'use client'; // For Next.js App Router client-side interactivity

import React, { useState, useEffect, useRef, useCallback } from 'react';
// useRouter might not be needed if not navigating, but could be used to trigger search for the completed phrase
// import { useRouter } from 'next/navigation';

// Interface for dictionary structure
interface WordDictionary {
  words: string[];
  phrases: string[];
}

// Interface for suggestion items (simplified for word completion)
export interface CompletionSuggestion {
  id: string;
  text: string; // The suggested word or phrase
  type: 'word' | 'phrase';
}

// Props for the Autocomplete component
export interface WordAutocompleteProps {
  dictionaryPath?: string;
  placeholder?: string;
  minCharsForSuggestion?: number; // Min chars of current word to trigger suggestions
  maxSuggestions?: number;
  debounceDelayMs?: number;
  inputClassName?: string;
  dropdownClassName?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  highlightClassName?: string; // For highlighting match within suggestion (optional)
  containerClassName?: string;
}

const WordAutocomplete: React.FC<WordAutocompleteProps> = ({
  dictionaryPath = '/word-dictionary.json',
  placeholder = 'Start typing...',
  minCharsForSuggestion = 1,
  maxSuggestions = 5,
  debounceDelayMs = 150,
  containerClassName = 'relative w-full',
  inputClassName = 'w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  dropdownClassName = 'absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto',
  itemClassName = 'px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 cursor-pointer',
  activeItemClassName = 'bg-blue-500 text-white hover:bg-blue-600',
  // highlightClassName = 'font-semibold', // Not actively used in this simple version
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CompletionSuggestion[]>([]);
  const [dictionary, setDictionary] = useState<WordDictionary>({ words: [], phrases: [] });
  const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // const router = useRouter(); // If you want to trigger a search on Enter or something

  // --- Debounce Utility ---
  const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<F>): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // --- Fetch word dictionary ---
  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const response = await fetch(dictionaryPath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setDictionary(await response.json());
      } catch (error) {
        console.error('Could not load word dictionary:', error);
      }
    };
    loadDictionary();
  }, [dictionaryPath]);

  // --- Get current word/phrase being typed ---
  const getCurrentTypingContext = (text: string): { currentWord: string; prefixText: string, entirePhrase: string } => {
    const lastSpaceIndex = text.lastIndexOf(' ');
    const prefixText = lastSpaceIndex === -1 ? '' : text.substring(0, lastSpaceIndex + 1);
    const currentWord = lastSpaceIndex === -1 ? text : text.substring(lastSpaceIndex + 1);
    return { currentWord, prefixText, entirePhrase: text };
  };

  // --- Filter suggestions (memoized) ---
  const filterSuggestions = useCallback(
    (currentFullText: string) => {
      const { currentWord, entirePhrase } = getCurrentTypingContext(currentFullText);
      const lowerCurrentWord = currentWord.toLowerCase();
      const lowerEntirePhrase = entirePhrase.toLowerCase();

      if (currentWord.length < minCharsForSuggestion && entirePhrase.length < minCharsForSuggestion) {
        setSuggestions([]);
        setIsDropdownVisible(false);
        return;
      }

      let matchedSuggestions: CompletionSuggestion[] = [];

      // Word suggestions (if currentWord is not empty)
      if (lowerCurrentWord && dictionary.words.length > 0) {
        const wordSugs = dictionary.words
          .filter(word => word.toLowerCase().startsWith(lowerCurrentWord) && word.toLowerCase() !== lowerCurrentWord)
          .map(word => ({ id: `word-${word}`, text: word, type: 'word' as 'word' }));
        matchedSuggestions.push(...wordSugs);
      }

      // Phrase suggestions (based on the entire input so far)
      if (dictionary.phrases.length > 0) {
          const phraseSugs = dictionary.phrases
            .filter(phrase => phrase.toLowerCase().startsWith(lowerEntirePhrase) && phrase.toLowerCase() !== lowerEntirePhrase)
            .map(phrase => ({id: `phrase-${phrase}`, text: phrase, type: 'phrase' as 'phrase'}));
          matchedSuggestions.push(...phraseSugs);
      }

      // Remove duplicates (e.g. if a word is also start of a phrase) and limit
      const uniqueSuggestions = Array.from(new Map(matchedSuggestions.map(s => [s.text, s])).values());

      setSuggestions(uniqueSuggestions.slice(0, maxSuggestions));
      setIsDropdownVisible(uniqueSuggestions.length > 0);
      setActiveIndex(-1);
    },
    [dictionary, minCharsForSuggestion, maxSuggestions]
  );

  // Debounced version for input changes
  const debouncedFilterSuggestions = useCallback(
    debounce(filterSuggestions, debounceDelayMs),
    [filterSuggestions, debounceDelayMs]
  );

  // --- Handle input change event ---
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newText = event.target.value;
    setInputValue(newText);
    if (!newText.trim()) {
      setSuggestions([]);
      setIsDropdownVisible(false);
    } else {
      debouncedFilterSuggestions(newText);
    }
  };

  // --- Handle suggestion item click ---
  const handleItemClick = (suggestion: CompletionSuggestion) => {
    const { prefixText } = getCurrentTypingContext(inputValue);
    let newText = '';
    if (suggestion.type === 'word') {
      newText = prefixText + suggestion.text + ' '; // Add space after word completion
    } else { // phrase
      newText = suggestion.text + ' '; // Add space after phrase completion
    }

    setInputValue(newText);
    setIsDropdownVisible(false);
    setActiveIndex(-1);
    searchInputRef.current?.focus();

    // Move cursor to end of input
    setTimeout(() => {
        if (searchInputRef.current) {
            searchInputRef.current.selectionStart = searchInputRef.current.selectionEnd = newText.length;
        }
    }, 0);
  };

  // --- Handle keyboard navigation ---
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownVisible || suggestions.length === 0) {
      if (event.key === 'Escape') setIsDropdownVisible(false);
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
      case 'Tab': // Use Tab for completion too
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          event.preventDefault();
          handleItemClick(suggestions[activeIndex]);
        } else {
          // If Enter is pressed without a suggestion selected, maybe submit form or clear suggestions
          setIsDropdownVisible(false);
          setActiveIndex(-1);
          // If 'Tab' and no suggestion, allow default tab behavior (do nothing here)
          if (event.key === 'Enter') event.preventDefault();
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsDropdownVisible(false);
        setActiveIndex(-1);
        break;
    }
  };

  // --- Scroll active item into view ---
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current && suggestions[activeIndex]) {
      const activeElementId = suggestions[activeIndex].id;
      const activeElement = dropdownRef.current.querySelector(`#${CSS.escape(activeElementId)}`);
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, suggestions]);

  // --- Handle clicks outside to close dropdown ---
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
            // Optionally show suggestions on focus if input is not empty
            if (inputValue.trim()) debouncedFilterSuggestions(inputValue);
        }}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isDropdownVisible && suggestions.length > 0}
        aria-controls="word-suggestions-listbox"
        aria-activedescendant={activeIndex >= 0 && suggestions[activeIndex] ? suggestions[activeIndex].id : undefined}
      />
      {isDropdownVisible && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          id="word-suggestions-listbox"
          className={dropdownClassName}
          role="listbox"
          aria-label="Word and phrase suggestions"
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
              {/* <span className="text-xs text-gray-400 ml-2">({item.type})</span> */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WordAutocomplete;