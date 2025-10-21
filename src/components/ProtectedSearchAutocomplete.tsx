'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Tag, Car } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSearchSuggestions, SearchSuggestion } from '@/app/actions/search-suggestions';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedSearchAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, loading } = useAuth();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar sugestões quando o usuário digita
  useEffect(() => {
    const searchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await getSearchSuggestions(query);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (query) {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Selecionar sugestão
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    // Se não está logado, redirecionar para planos
    if (!user) {
      router.push('/planos');
      return;
    }
    
    router.push(`/buscar?q=${encodeURIComponent(suggestion.value)}`);
    setIsOpen(false);
    setQuery('');
  };

  // Busca direta
  const handleSearch = () => {
    // Se não está logado, redirecionar para planos
    if (!user) {
      router.push('/planos');
      return;
    }
    
    if (query.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  // Separar marcas e modelos
  const brands = suggestions.filter((s) => s.type === 'brand');
  const models = suggestions.filter((s) => s.type === 'model');

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md">
      <div className="relative flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 z-10" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            placeholder="Ex: Chevrolet, Honda Civic, Corolla..."
            className="pl-10 h-12"
            disabled={loading}
          />
        </div>
        <Button
          size="lg"
          className="h-12"
          onClick={handleSearch}
          disabled={!query.trim() || loading}
        >
          {loading ? 'Carregando...' : 'Buscar Veículos'}
        </Button>
      </div>

      {/* Dropdown de sugestões */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <>
              {/* Marcas */}
              {brands.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b">
                    <span className="text-sm font-semibold text-gray-700">
                      Marcas
                    </span>
                  </div>
                  {brands.map((suggestion, index) => {
                    const globalIndex = index;
                    return (
                      <button
                        key={`brand-${suggestion.value}`}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                          selectedIndex === globalIndex ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Tag className="h-5 w-5 text-primary" />
                          <span className="font-medium text-left">
                            {suggestion.label}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground font-medium">
                          [{suggestion.count.toLocaleString('pt-BR')}]
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Modelos */}
              {models.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-t">
                    <span className="text-sm font-semibold text-gray-700">
                      Modelos
                    </span>
                  </div>
                  {models.map((suggestion, index) => {
                    const globalIndex = brands.length + index;
                    return (
                      <button
                        key={`model-${suggestion.value}`}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                          selectedIndex === globalIndex ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Car className="h-5 w-5 text-blue-500" />
                          <span className="text-left">{suggestion.label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground font-medium">
                          [{suggestion.count.toLocaleString('pt-BR')}]
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sem resultados */}
              {suggestions.length === 0 && !isLoading && (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhuma sugestão encontrada
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
