'use client';

import { useState, useEffect, useTransition, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MapPin, 
  Car, 
  Gavel,
  TrendingUp,
  X,
  Filter,
  Search,
  Loader2
} from "lucide-react";
import { getSearchSuggestions, type SearchSuggestions } from './actions';
import { cn } from '@/lib/utils';
interface FilterOptions {
  states: string[];
  citiesByState: Record<string, string[]>;
  auctioneers: string[];
  vehicleTypes?: string[];
}

interface VehicleFiltersProps {
  filterOptions: FilterOptions;
  currentFilters: {
    q?: string | string[];
    state?: string;
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    minYear?: string;
    maxYear?: string;
    vehicleType?: string[];
    hasFinancing?: boolean;
    auctioneer?: string[];
  };
}

// Valores exibidos no filtro (minúsculas) que serão mapeados para os valores do banco
const VEHICLE_TYPES = [
  { value: 'carro', label: 'Carros' },
  { value: 'moto', label: 'Motos' },
  { value: 'caminhao', label: 'Caminhões e Ônibus' },
];
const AUCTION_TYPES = ['online', 'presencial', 'hibrido'];

// FilterSection movido para fora para evitar recriação a cada render
const FilterSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm font-semibold">
      <Icon className="h-4 w-4" />
      <span>{title}</span>
    </div>
    {children}
  </div>
);

export function VehicleFilters({ filterOptions, currentFilters }: VehicleFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  // Estado dos filtros - garantir que não seja undefined
  const [filters, setFilters] = useState(currentFilters || {});
  
  // Estado local para termos de busca (não busca automaticamente)
  const currentQTerms = Array.isArray(currentFilters?.q) 
    ? currentFilters.q 
    : currentFilters?.q 
      ? [currentFilters.q] 
      : [];
  const [searchTerms, setSearchTerms] = useState<string[]>(currentQTerms);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para autocomplete
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({ titles: [] });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  // Refs para controle de foco e dropdown
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Flag para evitar que sincronizações vindas do servidor sobrescrevam interações do usuário
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  
  // Estados locais para campos numéricos (evitar perda de foco)
  const [localNumericValues, setLocalNumericValues] = useState({
    minYear: currentFilters?.minYear || '',
    maxYear: currentFilters?.maxYear || '',
    minPrice: currentFilters?.minPrice || '',
    maxPrice: currentFilters?.maxPrice || '',
  });

  // Manter foco ativo e caret após re-render
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusedInputId) return;
    const el = document.getElementById(focusedInputId) as HTMLInputElement | null;
    if (el) {
      const pos = el.value.length;
      el.focus();
      try { el.setSelectionRange(pos, pos); } catch {}
    }
  }, [localNumericValues, focusedInputId]);

  // Sincronizar com currentFilters quando mudarem
  useEffect(() => {
    if (currentFilters && !hasUserInteracted && searchQuery === '') {
      setFilters(currentFilters);
      setLocalNumericValues({
        minYear: currentFilters.minYear || '',
        maxYear: currentFilters.maxYear || '',
        minPrice: currentFilters.minPrice || '',
        maxPrice: currentFilters.maxPrice || '',
      });
      // Sincronizar termos de busca apenas se não estiver digitando
      const qTerms = Array.isArray(currentFilters.q) 
        ? currentFilters.q 
        : currentFilters.q 
          ? [currentFilters.q] 
          : [];
      setSearchTerms(qTerms);
    }
  }, [currentFilters, hasUserInteracted, searchQuery]);

  const updateFilter = (key: string, value: any) => {
    setHasUserInteracted(true);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: string, value: string) => {
    setHasUserInteracted(true);
    setFilters(prev => {
      const current = (prev[key as keyof typeof prev] as string[]) || [];
      const newArray = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: newArray };
    });
  };

  // Buscar sugestões com debounce
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions({ titles: [] });
      setIsLoadingSuggestions(false);
      setIsSuggestionsOpen(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const results = await getSearchSuggestions(query);
      setSuggestions(results);
      setIsSuggestionsOpen(true);
      setSelectedSuggestionIndex(-1);
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      setSuggestions({ titles: [] });
      setIsSuggestionsOpen(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Debounce da busca de sugestões
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      // Mostrar dropdown imediatamente quando usuário digita (com texto digitado como primeira opção)
      setIsSuggestionsOpen(true);
      setSelectedSuggestionIndex(-1);
      
      // Buscar sugestões com debounce
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(searchQuery);
      }, 300);
    } else {
      setSuggestions({ titles: [] });
      setIsSuggestionsOpen(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, fetchSuggestions]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Não fechar se estiver clicando no input ou no container de sugestões
      if (
        searchInputRef.current?.contains(target) ||
        suggestionsContainerRef.current?.contains(target)
      ) {
        return;
      }
      
      setIsSuggestionsOpen(false);
      setSelectedSuggestionIndex(-1);
    };

    // Usar 'click' ao invés de 'mousedown' para evitar conflitos
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, []);

  // Adicionar termo de busca ao estado local (memoizado)
  const addSearchTerm = useCallback((term: string) => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return;
    
    setHasUserInteracted(true);
    setSearchTerms(prev => {
      const termExists = prev.some(
        t => t.toLowerCase() === trimmedTerm.toLowerCase()
      );
      
      if (!termExists) {
        return [...prev, trimmedTerm];
      }
      return prev;
    });
    
    setSearchQuery(''); // Limpar campo após adicionar
    setSuggestions({ titles: [] });
    setIsSuggestionsOpen(false);
    setSelectedSuggestionIndex(-1);
    // Manter foco no campo após adicionar (usando requestAnimationFrame para garantir que o DOM foi atualizado)
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  // Remover termo de busca do estado local (memoizado)
  const removeSearchTerm = useCallback((termToRemove: string) => {
    setHasUserInteracted(true);
    setSearchTerms(prev => prev.filter(term => term !== termToRemove));
  }, []);

  // Navegação por teclado (memoizado)
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalSuggestions = combinedSuggestions.length;

    if (!isSuggestionsOpen || totalSuggestions === 0) {
      if (e.key === 'Enter' && searchQuery.trim()) {
        e.preventDefault();
        addSearchTerm(searchQuery.trim());
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev < totalSuggestions - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => 
          prev > 0 ? prev - 1 : totalSuggestions - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && combinedSuggestions[selectedSuggestionIndex]) {
          addSearchTerm(combinedSuggestions[selectedSuggestionIndex]);
        } else if (searchQuery.trim()) {
          addSearchTerm(searchQuery.trim());
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsSuggestionsOpen(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  }, [isSuggestionsOpen, combinedSuggestions, searchQuery, selectedSuggestionIndex, addSearchTerm]);

  // Handler memoizado para onChange do input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Lista combinada: texto digitado primeiro, depois sugestões (sem duplicatas)
  const combinedSuggestions = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    const hasQuery = trimmedQuery.length >= 2;
    
    if (!hasQuery) {
      return suggestions.titles;
    }
    
    // Filtrar sugestões para remover o texto digitado (case-insensitive) e evitar duplicatas
    const filteredSuggestions = suggestions.titles.filter(
      title => title.toLowerCase() !== trimmedQuery.toLowerCase()
    );
    
    // Sempre colocar o texto digitado como primeira opção
    return [trimmedQuery, ...filteredSuggestions];
  }, [searchQuery, suggestions.titles]);

  const applyFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams();
      
      // Incluir todos os termos de busca do estado local
      searchTerms.forEach(term => params.append('q', term));
      if (filters.state) params.set('state', filters.state);
      if (filters.city) params.set('city', filters.city);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.minYear) params.set('minYear', filters.minYear);
      if (filters.maxYear) params.set('maxYear', filters.maxYear);
      
      if (filters.vehicleType && filters.vehicleType.length > 0) {
        filters.vehicleType.forEach(vt => params.append('vehicleType', vt));
      }
      if (filters.auctioneer && filters.auctioneer.length > 0) {
        filters.auctioneer.forEach(a => params.append('auctioneer', a));
      }
      
      if (filters.hasFinancing !== undefined) {
        params.set('hasFinancing', filters.hasFinancing.toString());
      }

      // Após aplicar, liberamos sincronização com server-driven filters
      setHasUserInteracted(false);

      router.push(`/buscar?${params.toString()}`);
      setIsOpen(false);
    });
  };

  const clearFilters = () => {
    setHasUserInteracted(true);
    setFilters({
      q: undefined,
      state: undefined,
      city: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minYear: undefined,
      maxYear: undefined,
      vehicleType: undefined,
      hasFinancing: undefined,
      auctioneer: undefined,
    });
    setSearchTerms([]); // Limpar termos de busca
    router.push('/buscar');
  };

  const activeFiltersCount = Object.values(filters).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== '';
  }).length + (searchTerms.length > 0 ? 1 : 0); // Adicionar 1 se houver termos de busca

  return (
    <>
      {/* Botão mobile para abrir filtros */}
      <div className="md:hidden mb-4 sticky top-[73px] z-30 bg-background pb-2">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
          type="button"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>
      </div>

      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar de filtros */}
      <div className={`
        ${isOpen ? 'fixed inset-y-0 left-0 z-50 overflow-y-auto bg-background p-4' : 'hidden'} md:block
        w-full md:w-80 md:relative md:z-auto md:bg-transparent md:p-0 space-y-4 mb-6
      `}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros</CardTitle>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 text-xs"
                    type="button"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 md:hidden"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Busca por texto */}
            <FilterSection title="Busca por Título" icon={Search}>
              <div className="space-y-3">
                <div className="relative" ref={suggestionsContainerRef}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                  {isLoadingSuggestions && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground z-10" />
                  )}
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2 || suggestions.titles.length > 0) {
                        setIsSuggestionsOpen(true);
                      }
                    }}
                    placeholder="Buscar veículos..."
                    className="pl-9 pr-9"
                    autoComplete="off"
                  />
                  
                  {/* Dropdown de sugestões */}
                  {isSuggestionsOpen && combinedSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {combinedSuggestions.map((title, index) => {
                        const isQuery = index === 0 && searchQuery.trim().toLowerCase() === title.toLowerCase();
                        return (
                          <button
                            key={`${title}-${index}`}
                            type="button"
                            onClick={() => addSearchTerm(title)}
                            className={cn(
                              "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                              selectedSuggestionIndex === index && "bg-muted",
                              isQuery && "font-semibold"
                            )}
                          >
                            {title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Chips dos termos de busca */}
                {searchTerms.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {searchTerms.map((term, index) => (
                      <Badge
                        key={`${term}-${index}`}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
                      >
                        <span className="truncate max-w-[120px]">{term}</span>
                        <button
                          type="button"
                          onClick={() => removeSearchTerm(term)}
                          className="hover:bg-muted/80 rounded-full p-0.5 transition-colors flex-shrink-0"
                          aria-label={`Remover busca: ${term}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </FilterSection>

            {/* Localização */}
            <FilterSection title="Localização" icon={MapPin}>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Select
                    value={filters.state || ''}
                    onValueChange={(value) => {
                      updateFilter('state', value === 'all' ? undefined : value);
                      updateFilter('city', undefined); // Reset cidade ao mudar estado
                    }}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {!filterOptions || !filterOptions.states ? (
                        <SelectItem value="loading" disabled>Carregando estados...</SelectItem>
                      ) : filterOptions.states.length > 0 ? (
                        filterOptions.states.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty" disabled>Nenhum estado disponível</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {filters.state && filterOptions.citiesByState[filters.state] && (
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Select
                      value={filters.city || ''}
                      onValueChange={(value) => updateFilter('city', value === 'all' ? undefined : value)}
                    >
                      <SelectTrigger id="city">
                        <SelectValue placeholder="Selecione a cidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {filterOptions.citiesByState[filters.state] && filterOptions.citiesByState[filters.state].length > 0 ? (
                          filterOptions.citiesByState[filters.state].map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled>Nenhuma cidade disponível</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </FilterSection>

            {/* Veículo */}
            <FilterSection title="Veículo" icon={Car}>
              <div className="space-y-3">
                  <div>
                    <Label>Tipo de Veículo</Label>
                    <div className="space-y-2 mt-2">
                      {VEHICLE_TYPES.map(type => (
                        <div key={type.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`vehicle-${type.value}`}
                            checked={(filters.vehicleType || []).includes(type.value)}
                            onCheckedChange={() => toggleArrayFilter('vehicleType', type.value)}
                          />
                          <label
                            htmlFor={`vehicle-${type.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {type.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>


                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="minYear">Ano Mínimo</Label>
                      <Input
                        id="minYear"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="2020"
                        value={localNumericValues.minYear}
                        onChange={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const value = e.target.value.replace(/\D/g, '');
                          setLocalNumericValues(prev => ({ ...prev, minYear: value }));
                        }}
                        onFocus={() => setFocusedInputId('minYear')}
                        onBlur={() => {
                          updateFilter('minYear', localNumericValues.minYear || undefined);
                          setFocusedInputId(null);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxYear">Ano Máximo</Label>
                      <Input
                        id="maxYear"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="2024"
                        value={localNumericValues.maxYear}
                        onChange={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const value = e.target.value.replace(/\D/g, '');
                          setLocalNumericValues(prev => ({ ...prev, maxYear: value }));
                        }}
                        onFocus={() => setFocusedInputId('maxYear')}
                        onBlur={() => {
                          updateFilter('maxYear', localNumericValues.maxYear || undefined);
                          setFocusedInputId(null);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
            </FilterSection>

              {/* Leilão */}
              <FilterSection title="Leilão" icon={Gavel}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="financing"
                      checked={filters.hasFinancing || false}
                      onCheckedChange={(checked) => updateFilter('hasFinancing', checked)}
                    />
                    <label
                      htmlFor="financing"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Aceita Financiamento
                    </label>
                  </div>

                  {/* Leiloeiro */}
                  <div>
                    <Label htmlFor="auctioneer">Leiloeiro</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value && !(filters.auctioneer || []).includes(value)) {
                          updateFilter('auctioneer', [...(filters.auctioneer || []), value]);
                        }
                      }}
                    >
                      <SelectTrigger id="auctioneer">
                        <SelectValue placeholder="Adicionar leiloeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterOptions.auctioneers && filterOptions.auctioneers.length > 0 ? (
                          filterOptions.auctioneers.map(auctioneer => (
                            <SelectItem key={auctioneer} value={auctioneer}>{auctioneer}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled>Carregando leiloeiros...</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {(filters.auctioneer || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {filters.auctioneer?.map(auctioneer => (
                          <Badge key={auctioneer} variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium">
                            <span className="truncate max-w-[150px]">{auctioneer}</span>
                            <button
                              type="button"
                              onClick={() => {
                                updateFilter('auctioneer', filters.auctioneer?.filter(a => a !== auctioneer));
                              }}
                              className="hover:bg-muted/80 rounded-full p-0.5 transition-colors flex-shrink-0"
                              aria-label={`Remover leiloeiro: ${auctioneer}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </FilterSection>

            {/* Preço */}
            <FilterSection title="Preço" icon={TrendingUp}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="minPrice">Mínimo</Label>
                  <Input
                    id="minPrice"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="R$ 0"
                    value={localNumericValues.minPrice}
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const value = e.target.value.replace(/\D/g, '');
                      setLocalNumericValues(prev => ({ ...prev, minPrice: value }));
                    }}
                    onFocus={() => setFocusedInputId('minPrice')}
                    onBlur={() => {
                      updateFilter('minPrice', localNumericValues.minPrice || undefined);
                      setFocusedInputId(null);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="maxPrice">Máximo</Label>
                  <Input
                    id="maxPrice"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="R$ 500.000"
                    value={localNumericValues.maxPrice}
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const value = e.target.value.replace(/\D/g, '');
                      setLocalNumericValues(prev => ({ ...prev, maxPrice: value }));
                    }}
                    onFocus={() => setFocusedInputId('maxPrice')}
                    onBlur={() => {
                      updateFilter('maxPrice', localNumericValues.maxPrice || undefined);
                      setFocusedInputId(null);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}
                    autoComplete="off"
                  />
                </div>
              </div>
            </FilterSection>


            {/* Botões */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={applyFilters}
                disabled={isPending}
                className="flex-1"
                type="button"
              >
                {isPending ? 'Aplicando...' : 'Aplicar Filtros'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

