'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface WordDictionary {
  words: string[];
  phrases: string[];
}

export interface CompletionSuggestion {
  id: string;
  text: string;
  type: 'word' | 'phrase';
}

export interface WordAutocompleteProps {
  dictionaryPath?: string;
  placeholder?: string;
  minCharsForSuggestion?: number;
  maxSuggestions?: number;
  debounceDelayMs?: number;
  inputClassName?: string;
  dropdownClassName?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  highlightClassName?: string;
  containerClassName?: string;
}

const createSafeId = (prefix: string, text: string): string => {
  const sanitizedText = text.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/\s+/g, '-');
  return `${prefix}-${sanitizedText}`;
};

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
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CompletionSuggestion[]>([]);
  const [dictionary, setDictionary] = useState<WordDictionary>({ words: [], phrases: [] });
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

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const response = await fetch(dictionaryPath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} on path ${dictionaryPath}`);
        }
        setDictionary(await response.json());
      } catch (error) {
        console.error('Could not load word dictionary:', error);
      }
    };
    loadDictionary();
  }, [dictionaryPath]);

  const getCurrentTypingContext = (text: string): { currentWord: string; prefixText: string, entirePhrase: string } => {
    const lastSpaceIndex = text.lastIndexOf(' ');
    const prefixText = lastSpaceIndex === -1 ? '' : text.substring(0, lastSpaceIndex + 1);
    const currentWord = lastSpaceIndex === -1 ? text : text.substring(lastSpaceIndex + 1);
    return { currentWord, prefixText, entirePhrase: text };
  };

  const filterSuggestions = useCallback(
    (currentFullText: string) => {
      const { currentWord, entirePhrase } = getCurrentTypingContext(currentFullText);
      const lowerCurrentWord = currentWord.toLowerCase();
      const lowerEntirePhrase = entirePhrase.toLowerCase();

      let canShowSuggestions = false;
      if (!currentFullText.includes(' ')) {
        if (currentWord.length >= minCharsForSuggestion) {
          canShowSuggestions = true;
        }
      } else {
        if (currentWord.length >= minCharsForSuggestion || entirePhrase.length >= minCharsForSuggestion ) {
            canShowSuggestions = true;
        }
      }

      if (!canShowSuggestions || (!dictionary.words.length && !dictionary.phrases.length)) {
        setSuggestions([]);
        setIsDropdownVisible(false);
        return;
      }

      let matchedSuggestions: CompletionSuggestion[] = [];

      if (lowerCurrentWord && lowerCurrentWord.length >= minCharsForSuggestion && dictionary.words.length > 0) {
        const wordSugs = dictionary.words
          .filter(word => word.toLowerCase().startsWith(lowerCurrentWord) && word.toLowerCase() !== lowerCurrentWord)
          .map(word => ({ id: createSafeId('word', word), text: word, type: 'word' as 'word' }));
        matchedSuggestions.push(...wordSugs);
      }

      if (lowerEntirePhrase && lowerEntirePhrase.length >= minCharsForSuggestion && dictionary.phrases.length > 0) {
          const phraseSugs = dictionary.phrases
            .filter(phrase => phrase.toLowerCase().startsWith(lowerEntirePhrase) && phrase.toLowerCase() !== lowerEntirePhrase)
            .map(phrase => ({id: createSafeId('phrase', phrase), text: phrase, type: 'phrase' as 'phrase'}));
          matchedSuggestions.push(...phraseSugs);
      }

      const uniqueSuggestions = Array.from(new Map(matchedSuggestions.map(s => [s.text, s])).values());

      setSuggestions(uniqueSuggestions.slice(0, maxSuggestions));
      setIsDropdownVisible(uniqueSuggestions.length > 0);
      setActiveIndex(-1);
    },
    [dictionary, minCharsForSuggestion, maxSuggestions]
  );

  const debouncedFilterSuggestions = useCallback(
    debounce(filterSuggestions, debounceDelayMs),
    [filterSuggestions, debounceDelayMs]
  );

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

  const handleItemClick = (suggestion: CompletionSuggestion) => {
    const { prefixText } = getCurrentTypingContext(inputValue);
    let newText = '';
    if (suggestion.type === 'word') {
      newText = prefixText + suggestion.text + ' ';
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
            if (inputValue.trim()) {
                const { currentWord, entirePhrase } = getCurrentTypingContext(inputValue);
                if (currentWord.length >= minCharsForSuggestion || entirePhrase.length >= minCharsForSuggestion) {
                    debouncedFilterSuggestions(inputValue);
                }
            }
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WordAutocomplete;