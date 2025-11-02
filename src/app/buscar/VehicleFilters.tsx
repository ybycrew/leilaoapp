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
import { Slider } from "@/components/ui/slider";
import { 
  MapPin, 
  Car, 
  Fuel, 
  Settings, 
  Palette, 
  Gavel,
  TrendingUp,
  X,
  Filter
} from "lucide-react";
import { getModelsByBrand } from './actions';

interface FilterOptions {
  brands: string[];
  models: string[];
  states: string[];
  citiesByState: Record<string, string[]>;
  auctioneers: string[];
  fuels: string[];
  transmissions: string[];
  colors: string[];
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
    brand?: string[];
    model?: string[];
    fuelType?: string[];
    transmission?: string[];
    color?: string[];
    auctionType?: string[];
    hasFinancing?: boolean;
    minMileage?: string;
    maxMileage?: string;
    minDealScore?: string;
    minFipeDiscount?: string;
    auctioneer?: string[];
    licensePlateEnd?: string;
  };
}

const VEHICLE_TYPES = ['carro', 'moto', 'caminhao', 'van', 'outros'];
const AUCTION_TYPES = ['online', 'presencial', 'hibrido'];

export function VehicleFilters({ filterOptions, currentFilters }: VehicleFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  // Estado dos filtros
  const [filters, setFilters] = useState(currentFilters);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Quando a marca muda, buscar modelos
  useEffect(() => {
    const selectedBrands = filters.brand || [];
    if (selectedBrands.length > 0) {
      // Buscar modelos para todas as marcas selecionadas
      Promise.all(
        selectedBrands.map(brand => getModelsByBrand(brand))
      ).then(modelArrays => {
        const allModels = new Set<string>();
        modelArrays.forEach(models => {
          models.forEach(model => allModels.add(model));
        });
        setAvailableModels(Array.from(allModels).sort());
      });
    } else {
      setAvailableModels([]);
      setSelectedModels([]);
    }
  }, [filters.brand]);

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: string, value: string) => {
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
      const params = new URLSearchParams();
      
      if (filters.q) params.set('q', filters.q);
      if (filters.state) params.set('state', filters.state);
      if (filters.city) params.set('city', filters.city);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.minYear) params.set('minYear', filters.minYear);
      if (filters.maxYear) params.set('maxYear', filters.maxYear);
      if (filters.minMileage) params.set('minMileage', filters.minMileage);
      if (filters.maxMileage) params.set('maxMileage', filters.maxMileage);
      if (filters.minDealScore) params.set('minDealScore', filters.minDealScore);
      if (filters.minFipeDiscount) params.set('minFipeDiscount', filters.minFipeDiscount);
      if (filters.licensePlateEnd) params.set('licensePlateEnd', filters.licensePlateEnd);
      
      if (filters.vehicleType && filters.vehicleType.length > 0) {
        filters.vehicleType.forEach(vt => params.append('vehicleType', vt));
      }
      if (filters.brand && filters.brand.length > 0) {
        filters.brand.forEach(b => params.append('brand', b));
      }
      if (filters.model && filters.model.length > 0) {
        filters.model.forEach(m => params.append('model', m));
      }
      if (filters.fuelType && filters.fuelType.length > 0) {
        filters.fuelType.forEach(f => params.append('fuelType', f));
      }
      if (filters.transmission && filters.transmission.length > 0) {
        filters.transmission.forEach(t => params.append('transmission', t));
      }
      if (filters.color && filters.color.length > 0) {
        filters.color.forEach(c => params.append('color', c));
      }
      if (filters.auctionType && filters.auctionType.length > 0) {
        filters.auctionType.forEach(a => params.append('auctionType', a));
      }
      if (filters.auctioneer && filters.auctioneer.length > 0) {
        filters.auctioneer.forEach(a => params.append('auctioneer', a));
      }
      
      if (filters.hasFinancing !== undefined) {
        params.set('hasFinancing', filters.hasFinancing.toString());
      }

      router.push(`/buscar?${params.toString()}`);
      setIsOpen(false);
    });
  };

  const clearFilters = () => {
    setFilters({
      q: undefined,
      state: undefined,
      city: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minYear: undefined,
      maxYear: undefined,
      vehicleType: undefined,
      brand: undefined,
      model: undefined,
      fuelType: undefined,
      transmission: undefined,
      color: undefined,
      auctionType: undefined,
      hasFinancing: undefined,
      minMileage: undefined,
      maxMileage: undefined,
      minDealScore: undefined,
      minFipeDiscount: undefined,
      auctioneer: undefined,
      licensePlateEnd: undefined,
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
      <div className="md:hidden mb-4">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>
      </div>

      {/* Sidebar de filtros */}
      <div className={`
        ${isOpen ? 'block' : 'hidden'} md:block
        w-full md:w-80 space-y-4 mb-6
      `}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros</CardTitle>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
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
                      updateFilter('state', value);
                      updateFilter('city', undefined); // Reset cidade ao mudar estado
                    }}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {filterOptions.states.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filters.state && filterOptions.citiesByState[filters.state] && (
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Select
                      value={filters.city || ''}
                      onValueChange={(value) => updateFilter('city', value)}
                    >
                      <SelectTrigger id="city">
                        <SelectValue placeholder="Selecione a cidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas</SelectItem>
                        {filterOptions.citiesByState[filters.state].map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
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
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vehicle-${type}`}
                          checked={(filters.vehicleType || []).includes(type)}
                          onCheckedChange={() => toggleArrayFilter('vehicleType', type)}
                        />
                        <label
                          htmlFor={`vehicle-${type}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !(filters.brand || []).includes(value)) {
                        updateFilter('brand', [...(filters.brand || []), value]);
                      }
                    }}
                  >
                    <SelectTrigger id="brand">
                      <SelectValue placeholder="Adicionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.brands.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(filters.brand || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {filters.brand?.map(brand => (
                        <Badge key={brand} variant="secondary" className="flex items-center gap-1">
                          {brand}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => {
                              updateFilter('brand', filters.brand?.filter(b => b !== brand));
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {availableModels.length > 0 && (
                  <div>
                    <Label htmlFor="model">Modelo</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value && !(filters.model || []).includes(value)) {
                          updateFilter('model', [...(filters.model || []), value]);
                        }
                      }}
                    >
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Adicionar modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map(model => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(filters.model || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {filters.model?.map(model => (
                          <Badge key={model} variant="secondary" className="flex items-center gap-1">
                            {model}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => {
                                updateFilter('model', filters.model?.filter(m => m !== model));
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="minYear">Ano Mínimo</Label>
                    <Input
                      id="minYear"
                      type="number"
                      placeholder="2020"
                      value={filters.minYear || ''}
                      onChange={(e) => updateFilter('minYear', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxYear">Ano Máximo</Label>
                    <Input
                      id="maxYear"
                      type="number"
                      placeholder="2024"
                      value={filters.maxYear || ''}
                      onChange={(e) => updateFilter('maxYear', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </FilterSection>

            {/* Especificações - FASE 1 */}
            <FilterSection title="Especificações" icon={Settings}>
              <div className="space-y-3">
                <div>
                  <Label>Combustível</Label>
                  <div className="space-y-2 mt-2">
                    {filterOptions.fuels.slice(0, 10).map(fuel => (
                      <div key={fuel} className="flex items-center space-x-2">
                        <Checkbox
                          id={`fuel-${fuel}`}
                          checked={(filters.fuelType || []).includes(fuel)}
                          onCheckedChange={() => toggleArrayFilter('fuelType', fuel)}
                        />
                        <label
                          htmlFor={`fuel-${fuel}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {fuel}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Câmbio</Label>
                  <div className="space-y-2 mt-2">
                    {filterOptions.transmissions.slice(0, 5).map(transmission => (
                      <div key={transmission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`transmission-${transmission}`}
                          checked={(filters.transmission || []).includes(transmission)}
                          onCheckedChange={() => toggleArrayFilter('transmission', transmission)}
                        />
                        <label
                          htmlFor={`transmission-${transmission}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {transmission}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FilterSection>

            {/* Leilão - FASE 1 */}
            <FilterSection title="Leilão" icon={Gavel}>
              <div className="space-y-3">
                <div>
                  <Label>Tipo de Leilão</Label>
                  <div className="space-y-2 mt-2">
                    {AUCTION_TYPES.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`auction-${type}`}
                          checked={(filters.auctionType || []).includes(type)}
                          onCheckedChange={() => toggleArrayFilter('auctionType', type)}
                        />
                        <label
                          htmlFor={`auction-${type}`}
                          className="text-sm font-medium leading-none cursor-pointer capitalize"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

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

                {/* FASE 3: Leiloeiro */}
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
                      {filterOptions.auctioneers.map(auctioneer => (
                        <SelectItem key={auctioneer} value={auctioneer}>{auctioneer}</SelectItem>
                      ))}
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
                    type="number"
                    placeholder="R$ 0"
                    value={filters.minPrice || ''}
                    onChange={(e) => updateFilter('minPrice', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxPrice">Máximo</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    placeholder="R$ 500.000"
                    value={filters.maxPrice || ''}
                    onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  />
                </div>
              </div>
            </FilterSection>

            {/* FASE 2: Quilometragem */}
            <FilterSection title="Quilometragem" icon={Car}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="maxMileage">KM Máximo</Label>
                  <Input
                    id="maxMileage"
                    type="number"
                    placeholder="100.000"
                    value={filters.maxMileage || ''}
                    onChange={(e) => updateFilter('maxMileage', e.target.value)}
                  />
                </div>
              </div>
            </FilterSection>

            {/* FASE 2: Oportunidade */}
            <FilterSection title="Oportunidade" icon={TrendingUp}>
              <div className="space-y-4">
                <div>
                  <Label>Deal Score Mínimo: {filters.minDealScore || 0}</Label>
                  <Slider
                    value={[parseInt(filters.minDealScore || '0')]}
                    onValueChange={([value]) => updateFilter('minDealScore', value.toString())}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span>
                    <span>50</span>
                    <span>70</span>
                    <span>100</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="minFipeDiscount">Desconto FIPE Mínimo (%)</Label>
                  <Input
                    id="minFipeDiscount"
                    type="number"
                    placeholder="20"
                    value={filters.minFipeDiscount || ''}
                    onChange={(e) => updateFilter('minFipeDiscount', e.target.value)}
                  />
                </div>
              </div>
            </FilterSection>

            {/* FASE 3: Cor */}
            <FilterSection title="Cor" icon={Palette}>
              <div>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !(filters.color || []).includes(value)) {
                      updateFilter('color', [...(filters.color || []), value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar cor" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.colors.slice(0, 20).map(color => (
                      <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(filters.color || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {filters.color?.map(color => (
                      <Badge key={color} variant="secondary" className="flex items-center gap-1">
                        {color}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => {
                            updateFilter('color', filters.color?.filter(c => c !== color));
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </FilterSection>

            {/* FASE 3: Placa Final */}
            <div>
              <Label htmlFor="licensePlateEnd">Placa Final</Label>
              <Input
                id="licensePlateEnd"
                type="text"
                placeholder="Ex: 0"
                maxLength={1}
                value={filters.licensePlateEnd || ''}
                onChange={(e) => updateFilter('licensePlateEnd', e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={applyFilters}
                disabled={isPending}
                className="flex-1"
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

