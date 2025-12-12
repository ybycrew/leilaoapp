'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { getSearchSuggestions, type SearchSuggestions } from './actions';
import { cn } from '@/lib/utils';
import { SearchChips } from './SearchChips';

export function SearchAutocomplete() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Pegar termos de busca atuais da URL (pode ser array)
  const currentSearchTerms = searchParams.getAll('q').filter(term => term.trim().length > 0);
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({
    titles: [],
    total: 0,
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
      setSuggestions({ titles: [], total: 0 });
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
      setSuggestions({ titles: [], total: 0 });
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
      setSuggestions({ titles: [], total: 0 });
      setIsOpen(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Adicionar termo de busca
  const addSearchTerm = useCallback(
    (searchQuery: string) => {
      const trimmedTerm = searchQuery.trim();
      if (!trimmedTerm) return;
      
      const currentTerms = searchParams.getAll('q').filter(term => term.trim().length > 0);
      // Evitar duplicatas (case-insensitive)
      const termExists = currentTerms.some(
        term => term.toLowerCase() === trimmedTerm.toLowerCase()
      );
      
      if (!termExists) {
        const params = new URLSearchParams(searchParams.toString());
        // Adicionar novo termo
        params.append('q', trimmedTerm);
        params.delete('page'); // Reset para primeira página
        router.push(`/buscar?${params.toString()}`);
      }
      
      // Limpar campo de busca após adicionar
      setQuery('');
    },
    [router, searchParams]
  );

  // Fechar sugestões ao clicar fora e adicionar termo automaticamente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Se houver texto digitado (mínimo 2 caracteres), adicionar automaticamente
        const trimmedQuery = query.trim();
        if (trimmedQuery.length >= 2) {
          addSearchTerm(trimmedQuery);
        } else {
          // Apenas fechar se não houver texto válido
          setIsOpen(false);
          setSelectedIndex(-1);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, addSearchTerm]);

  const totalItems = suggestions.titles.length;

  // Remover termo de busca
  const removeSearchTerm = useCallback(
    (termToRemove: string) => {
      const currentTerms = searchParams.getAll('q').filter(term => term.trim().length > 0);
      const newTerms = currentTerms.filter(term => term !== termToRemove);
      
      const params = new URLSearchParams(searchParams.toString());
      // Remover todos os q
      params.delete('q');
      // Adicionar os restantes
      newTerms.forEach(term => params.append('q', term));
      params.delete('page');
      
      router.push(`/buscar?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Limpar busca (remover todos os termos)
  const handleClear = useCallback(() => {
    setQuery('');
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('page');
    router.push(`/buscar?${params.toString()}`);
    inputRef.current?.focus();
  }, [router, searchParams]);

  // Selecionar sugestão
  const handleSelectSuggestion = useCallback(
    (value: string) => {
      addSearchTerm(value);
      setIsOpen(false);
      setSelectedIndex(-1);
    },
    [addSearchTerm]
  );

  // Navegação por teclado
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || totalItems === 0) {
        if (e.key === 'Enter' && query.trim()) {
          addSearchTerm(query.trim());
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
            addSearchTerm(query.trim());
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
    [isOpen, totalItems, selectedIndex, query, suggestions.titles, addSearchTerm, handleSelectSuggestion]
  );

  return (
    <div className="flex-1 max-w-2xl space-y-2">
      {/* Chips dos termos de busca */}
      {currentSearchTerms.length > 0 && (
        <SearchChips
          searchTerms={currentSearchTerms}
          onRemove={removeSearchTerm}
        />
      )}
      
      <div ref={containerRef} className="relative">
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
          onBlur={(e) => {
            // Usar setTimeout para permitir que cliques em sugestões funcionem primeiro
            setTimeout(() => {
              const trimmedQuery = query.trim();
              // Verificar se o foco não foi para uma sugestão ou o próprio input
              const activeElement = document.activeElement;
              const isClickingSuggestion = containerRef.current?.contains(activeElement);
              
              // Se houver texto válido e não estiver clicando em uma sugestão, adicionar automaticamente
              if (trimmedQuery.length >= 2 && !isClickingSuggestion && activeElement !== inputRef.current) {
                addSearchTerm(trimmedQuery);
              }
            }, 200);
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
