import { searchVehicles, getVehicleStats, getFilterOptions } from './actions';
import { SortSelect } from './SortSelect';
import { VehicleFilters } from './VehicleFilters';
import { SearchAutocomplete } from './SearchAutocomplete';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { MapPin, Calendar, Fuel, Gauge, TrendingDown } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    state?: string;
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    minYear?: string;
    maxYear?: string;
    vehicleType?: string | string[];
    fuelType?: string | string[];
    transmission?: string | string[];
    color?: string | string[];
    auctionType?: string | string[];
    hasFinancing?: string;
    minMileage?: string;
    maxMileage?: string;
    minDealScore?: string;
    minFipeDiscount?: string;
    auctioneer?: string | string[];
    licensePlateEnd?: string;
    orderBy?: string;
    page?: string;
  }>;
}

export default async function BuscarPage({ searchParams }: SearchPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/planos');
  }
  
  const params = await searchParams;
  
  const normalizeArrayParam = (param: string | string[] | undefined): string[] | undefined => {
    if (!param) return undefined;
    if (Array.isArray(param)) return param;
    return [param];
  };

  const normalizedFilters = {
    q: params.q,
    state: params.state,
    city: params.city,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    minYear: params.minYear,
    maxYear: params.maxYear,
    vehicleType: normalizeArrayParam(params.vehicleType),
    fuelType: normalizeArrayParam(params.fuelType),
    transmission: normalizeArrayParam(params.transmission),
    color: normalizeArrayParam(params.color),
    auctionType: normalizeArrayParam(params.auctionType),
    hasFinancing: params.hasFinancing === 'true' ? true : params.hasFinancing === 'false' ? false : undefined,
    minMileage: params.minMileage,
    maxMileage: params.maxMileage,
    minDealScore: params.minDealScore,
    minFipeDiscount: params.minFipeDiscount,
    auctioneer: normalizeArrayParam(params.auctioneer),
    licensePlateEnd: params.licensePlateEnd,
  };

  const currentPage = params.page ? parseInt(params.page) : 1;
  const pageSize = 20; // Itens por página

  const { vehicles, total, error, pagination } = await searchVehicles({
    q: params.q,
    state: params.state,
    city: params.city,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
    minYear: params.minYear ? parseInt(params.minYear) : undefined,
    maxYear: params.maxYear ? parseInt(params.maxYear) : undefined,
    vehicleType: normalizeArrayParam(params.vehicleType),
    fuelType: normalizeArrayParam(params.fuelType),
    transmission: normalizeArrayParam(params.transmission),
    color: normalizeArrayParam(params.color),
    auctionType: normalizeArrayParam(params.auctionType),
    hasFinancing: params.hasFinancing === 'true' ? true : params.hasFinancing === 'false' ? false : undefined,
    minMileage: params.minMileage ? parseInt(params.minMileage) : undefined,
    maxMileage: params.maxMileage ? parseInt(params.maxMileage) : undefined,
    minDealScore: params.minDealScore ? parseInt(params.minDealScore) : undefined,
    minFipeDiscount: params.minFipeDiscount ? parseFloat(params.minFipeDiscount) : undefined,
    auctioneer: normalizeArrayParam(params.auctioneer),
    licensePlateEnd: params.licensePlateEnd,
    orderBy: (params.orderBy as any) || 'deal_score',
    page: currentPage,
    limit: pageSize,
  });

  const stats = await getVehicleStats();
  const filterOptions = await getFilterOptions();
  
  // Log detalhado para debug
  console.log('[BuscarPage] Filter options recebidos:', {
    statesCount: filterOptions.states.length,
    states: filterOptions.states.slice(0, 5),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <h1 className="text-xl font-bold cursor-pointer hover:text-primary">Ybybid</h1>
            </Link>
            <SearchAutocomplete defaultValue={params.q || ''} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            Erro ao buscar veículos: {error}
          </div>
        )}

        <div className="flex gap-6">
          <aside className="hidden md:block flex-shrink-0">
            <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando filtros...</div>}>
              <VehicleFilters 
                filterOptions={filterOptions}
                currentFilters={normalizedFilters}
              />
            </Suspense>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {pagination ? (
                    <>
                      Mostrando <strong>{((currentPage - 1) * pageSize) + 1}</strong> a{' '}
                      <strong>{Math.min(currentPage * pageSize, total)}</strong> de{' '}
                      <strong>{total}</strong> veículos
                      {params.q && ` para "${params.q}"`}
                    </>
                  ) : (
                    <>
                      Mostrando <strong>{total} veículos</strong>
                      {params.q && ` para "${params.q}"`}
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalVehicles} veículos no total • {stats.totalBrands} marcas
                </p>
              </div>
              <SortSelect defaultValue={params.orderBy} />
            </div>

            {vehicles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum veículo encontrado.</p>
                <Link href="/buscar">
                  <Button className="mt-4">Ver todos os veículos</Button>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {vehicles.map((vehicle) => (
                  <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-48 bg-gray-100">
                      {vehicle.thumbnail_url ? (
                        <Image 
                          src={vehicle.thumbnail_url}
                          alt={vehicle.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-sm">Sem imagem</span>
                        </div>
                      )}
                      {vehicle.deal_score && vehicle.deal_score >= 70 && (
                        <Badge className="absolute top-2 right-2 bg-green-500">
                          Score: {vehicle.deal_score}
                        </Badge>
                      )}
                      {vehicle.deal_score && vehicle.deal_score < 70 && vehicle.deal_score >= 50 && (
                        <Badge className="absolute top-2 right-2 bg-blue-500">
                          Score: {vehicle.deal_score}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">
                        {vehicle.brand} {vehicle.model} {vehicle.year_model}
                      </h3>
                      
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{vehicle.city}, {vehicle.state}</span>
                        </div>
                        {vehicle.auction_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Leilão: {new Date(vehicle.auction_date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                        {vehicle.mileage && (
                          <div className="flex items-center gap-2">
                            <Gauge className="h-4 w-4" />
                            <span>{vehicle.mileage.toLocaleString('pt-BR')} km</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold text-primary">
                            {vehicle.current_bid 
                              ? `R$ ${vehicle.current_bid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : 'Consultar'
                            }
                          </p>
                          {vehicle.fipe_price && vehicle.fipe_discount_percentage && (
                            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                              <TrendingDown className="h-3 w-3" />
                              FIPE: R$ {vehicle.fipe_price.toLocaleString('pt-BR')} 
                              ({vehicle.fipe_discount_percentage.toFixed(0)}% off)
                            </div>
                          )}
                        </div>
                        <a 
                          href={vehicle.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm">Ver Leilão</Button>
                        </a>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        via {vehicle.auctioneer_name}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Componente de Paginação */}
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                baseUrl="/buscar"
                searchParams={params}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}