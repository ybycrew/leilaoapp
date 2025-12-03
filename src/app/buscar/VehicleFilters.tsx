'use client';

import { useState, useEffect, useTransition } from 'react';
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
  Filter
} from "lucide-react";
interface FilterOptions {
  states: string[];
  citiesByState: Record<string, string[]>;
  auctioneers: string[];
  vehicleTypes?: string[];
}

interface VehicleFiltersProps {
  filterOptions: FilterOptions;
  currentFilters: {
    q?: string;
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

export function VehicleFilters({ filterOptions, currentFilters }: VehicleFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  // Estado dos filtros - garantir que não seja undefined
  const [filters, setFilters] = useState(currentFilters || {});
  
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
    if (currentFilters && !hasUserInteracted) {
      setFilters(currentFilters);
      setLocalNumericValues({
        minYear: currentFilters.minYear || '',
        maxYear: currentFilters.maxYear || '',
        minPrice: currentFilters.minPrice || '',
        maxPrice: currentFilters.maxPrice || '',
      });
    }
  }, [currentFilters, hasUserInteracted]);

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

  const applyFilters = () => {
    startTransition(() => {
      // Pegar todos os termos q da URL atual (não do estado local) para manter sincronização
      const currentQTerms = searchParams.getAll('q').filter(term => term.trim().length > 0);
      const params = new URLSearchParams();
      
      // Incluir todos os termos q
      currentQTerms.forEach(term => params.append('q', term));
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
    router.push('/buscar');
  };

  const activeFiltersCount = Object.values(filters).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== '';
  }).length;

  const FilterSection = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      {children}
    </div>
  );

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
                          <Badge key={auctioneer} variant="secondary" className="flex items-center gap-1">
                            {auctioneer}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => {
                                updateFilter('auctioneer', filters.auctioneer?.filter(a => a !== auctioneer));
                              }}
                            />
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

