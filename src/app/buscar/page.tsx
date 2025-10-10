import { searchVehicles, getVehicleStats } from './actions';
import { SortSelect } from './SortSelect';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Calendar, Fuel, Gauge, TrendingDown } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    state?: string;
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    minYear?: string;
    maxYear?: string;
    orderBy?: string;
  }>;
}

export default async function BuscarPage({ searchParams }: SearchPageProps) {
  // Await searchParams (Next.js 15)
  const params = await searchParams;
  
  // Buscar veículos
  const { vehicles, total, error } = await searchVehicles({
    q: params.q,
    state: params.state,
    city: params.city,
    minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
    minYear: params.minYear ? parseInt(params.minYear) : undefined,
    maxYear: params.maxYear ? parseInt(params.maxYear) : undefined,
    orderBy: (params.orderBy as any) || 'deal_score',
    limit: 50,
  });

  // Estatísticas
  const stats = await getVehicleStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <h1 className="text-xl font-bold cursor-pointer hover:text-primary">Ybybid</h1>
            </Link>
            <form action="/buscar" method="GET" className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input 
                  name="q"
                  defaultValue={params.q}
                  placeholder="Buscar veículos..." 
                  className="pl-10"
                />
              </div>
            </form>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            Erro ao buscar veículos: {error}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Mostrando <strong>{total} veículos</strong>
              {params.q && ` para "${params.q}"`}
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
      </div>
    </div>
  );
}

