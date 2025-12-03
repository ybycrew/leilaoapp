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
    brands: [],
    models: [],
    titles: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [highlightedItem, setHighlightedItem] = useState<{ type: string; index: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar sugestões com debounce
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions({ brands: [], models: [], titles: [] });
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
      setSuggestions({ brands: [], models: [], titles: [] });
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
      setSuggestions({ brands: [], models: [], titles: [] });
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

  // Calcular total de itens para navegação por teclado
  const totalItems = suggestions.brands.length + suggestions.models.length + suggestions.titles.length;

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
          setSelectedIndex((prev) => {
            const newIndex = prev < totalItems - 1 ? prev + 1 : 0;
            updateHighlight(newIndex);
            return newIndex;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = prev > 0 ? prev - 1 : totalItems - 1;
            updateHighlight(newIndex);
            return newIndex;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            const item = getItemByIndex(selectedIndex);
            if (item) {
              handleSelectSuggestion(item.value, item.type);
            }
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
    [isOpen, totalItems, selectedIndex, query]
  );

  // Atualizar highlight baseado no índice
  const updateHighlight = useCallback((index: number) => {
    let currentIndex = 0;

    if (index < suggestions.brands.length) {
      setHighlightedItem({ type: 'brand', index });
      return;
    }
    currentIndex += suggestions.brands.length;

    if (index < currentIndex + suggestions.models.length) {
      setHighlightedItem({ type: 'model', index: index - currentIndex });
      return;
    }
    currentIndex += suggestions.models.length;

    if (index < currentIndex + suggestions.titles.length) {
      setHighlightedItem({ type: 'title', index: index - currentIndex });
      return;
    }
  }, [suggestions]);

  // Obter item por índice
  const getItemByIndex = useCallback(
    (index: number): { value: string; type: string } | null => {
      let currentIndex = 0;

      if (index < suggestions.brands.length) {
        return { value: suggestions.brands[index], type: 'brand' };
      }
      currentIndex += suggestions.brands.length;

      if (index < currentIndex + suggestions.models.length) {
        return { value: suggestions.models[index - currentIndex], type: 'model' };
      }
      currentIndex += suggestions.models.length;

      if (index < currentIndex + suggestions.titles.length) {
        return { value: suggestions.titles[index - currentIndex], type: 'title' };
      }

      return null;
    },
    [suggestions]
  );

  // Selecionar sugestão
  const handleSelectSuggestion = useCallback(
    (value: string, type: string) => {
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

  // Renderizar item de sugestão
  const renderSuggestionItem = (
    value: string,
    type: 'brand' | 'model' | 'title',
    index: number,
    listIndex: number
  ) => {
    const isHighlighted =
      highlightedItem?.type === type && highlightedItem.index === index;

    const getIcon = () => {
      switch (type) {
        case 'brand':
          return '🏷️';
        case 'model':
          return '🚗';
        case 'title':
          return '📄';
      }
    };

    return (
      <button
        key={`${type}-${index}`}
        type="button"
        className={cn(
          'w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2 text-sm',
          isHighlighted && 'bg-muted'
        )}
        onMouseEnter={() => {
          setSelectedIndex(listIndex);
          setHighlightedItem({ type, index });
        }}
        onClick={() => handleSelectSuggestion(value, type)}
      >
        <span>{getIcon()}</span>
        <span className="flex-1 truncate">{value}</span>
      </button>
    );
  };

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
            setHighlightedItem(null);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2 && totalItems > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Buscar por marca, modelo, título..."
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
              {suggestions.brands.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                    Marcas
                  </div>
                  {suggestions.brands.map((brand, index) =>
                    renderSuggestionItem(
                      brand,
                      'brand',
                      index,
                      index
                    )
                  )}
                </div>
              )}

              {suggestions.models.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                    Modelos
                  </div>
                  {suggestions.models.map((model, index) =>
                    renderSuggestionItem(
                      model,
                      'model',
                      index,
                      suggestions.brands.length + index
                    )
                  )}
                </div>
              )}

              {suggestions.titles.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                    Veículos
                  </div>
                  {suggestions.titles.map((title, index) =>
                    renderSuggestionItem(
                      title,
                      'title',
                      index,
                      suggestions.brands.length + suggestions.models.length + index
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

