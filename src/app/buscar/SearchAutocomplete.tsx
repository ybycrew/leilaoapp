'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { getSearchSuggestions, type SearchSuggestions } from './actions';
import { cn } from '@/lib/utils';

export function SearchAutocomplete({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({
    titles: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar sugestões com debounce
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions({ titles: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await getSearchSuggestions(searchQuery);
      setSuggestions(results);
      setIsOpen(true);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      setSuggestions({ titles: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce da busca
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, 300);
    } else {
      setSuggestions({ titles: [] });
      setIsOpen(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalItems = suggestions.titles.length;

  // Navegação por teclado
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || totalItems === 0) {
        if (e.key === 'Enter' && query.trim()) {
          handleSearch(query.trim());
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions.titles[selectedIndex]) {
            handleSelectSuggestion(suggestions.titles[selectedIndex]);
          } else if (query.trim()) {
            handleSearch(query.trim());
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, totalItems, selectedIndex, query, suggestions.titles]
  );

  // Selecionar sugestão
  const handleSelectSuggestion = useCallback(
    (value: string) => {
      setQuery(value);
      setIsOpen(false);
      setSelectedIndex(-1);
      handleSearch(value);
    },
    []
  );

  // Realizar busca
  const handleSearch = useCallback(
    (searchQuery: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      } else {
        params.delete('q');
      }
      params.delete('page'); // Reset para primeira página
      router.push(`/buscar?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Limpar busca
  const handleClear = useCallback(() => {
    setQuery('');
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('page');
    router.push(`/buscar?${params.toString()}`);
    inputRef.current?.focus();
  }, [router, searchParams]);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 z-10" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2 && totalItems > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Buscar veículos por título..."
          className="pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sugestões */}
      {isOpen && (totalItems > 0 || isLoading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {suggestions.titles.length > 0 && (
                <div>
                  {suggestions.titles.map((title, index) => (
                    <button
                      key={`title-${index}`}
                      type="button"
                      className={cn(
                        'w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2 text-sm',
                        selectedIndex === index && 'bg-muted'
                      )}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => handleSelectSuggestion(title)}
                    >
                      <span>🚗</span>
                      <span className="flex-1 truncate">{title}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
