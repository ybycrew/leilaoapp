import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vehicle } from "@/types/vehicle";
import { MapPin, Calendar, Gauge, Fuel, Heart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getScoreBadgeColor, getScoreLabel } from "@/lib/scoring";
import Image from "next/image";

interface VehicleCardProps {
  vehicle: Vehicle;
  onFavorite?: (vehicleId: string) => void;
  isFavorited?: boolean;
}

export function VehicleCard({ vehicle, onFavorite, isFavorited = false }: VehicleCardProps) {
  const dealScore = vehicle.deal_score ?? 0;
  const scoreColor = getScoreBadgeColor(dealScore);
  const scoreLabel = getScoreLabel(dealScore);
  
  // Usar fipe_price ou fipe_preco (compatibilidade)
  const fipePrice = vehicle.fipe_price ?? vehicle.fipe_preco;
  // Usar preco_atual ou current_bid (compatibilidade)
  const currentPrice = vehicle.preco_atual ?? vehicle.current_bid ?? 0;
  
  const descontoFipe = fipePrice && fipePrice > 0
    ? Math.round(((fipePrice - currentPrice) / fipePrice) * 100)
    : 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <div className="relative h-48 bg-gray-200">
        <Badge className={`absolute top-2 right-2 ${scoreColor} text-white`}>
          Score: {dealScore}
        </Badge>
        {onFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(vehicle.id);
            }}
            className="absolute top-2 left-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors z-10"
          >
            <Heart 
              className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
            />
          </button>
        )}
        {(vehicle.imagens && vehicle.imagens.length > 0) || vehicle.thumbnail_url ? (
          <Image
            src={(vehicle.imagens && vehicle.imagens.length > 0) ? vehicle.imagens[0] : (vehicle.thumbnail_url || '')}
            alt={vehicle.title || vehicle.titulo || 'Veículo'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sem imagem
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold mb-2 line-clamp-2">{vehicle.title || vehicle.titulo || 'Veículo'}</h3>
        
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{vehicle.city || vehicle.cidade || ''}, {vehicle.state || vehicle.estado || ''}</span>
          </div>
          
          {(vehicle.auction_date || vehicle.data_leilao) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Leilão: {new Date(vehicle.auction_date || vehicle.data_leilao || '').toLocaleDateString('pt-BR')}</span>
            </div>
          )}
          
          {(vehicle.mileage || vehicle.km) && (
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 flex-shrink-0" />
              <span>{(vehicle.mileage || vehicle.km || 0).toLocaleString('pt-BR')} km</span>
            </div>
          )}
          
          {(vehicle.fuel_type || vehicle.combustivel || vehicle.transmission || vehicle.cambio) && (
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {vehicle.fuel_type || vehicle.combustivel || ''} 
                {(vehicle.transmission || vehicle.cambio) && ` • ${vehicle.transmission || vehicle.cambio}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(currentPrice)}
            </p>
            {fipePrice && (
              <p className="text-xs text-muted-foreground">
                FIPE: {formatCurrency(fipePrice)} 
                {descontoFipe > 0 && (
                  <span className="text-green-600 font-medium ml-1">
                    (-{descontoFipe}%)
                  </span>
                )}
              </p>
            )}
          </div>
          
          <Badge 
            variant="outline" 
            className={
              dealScore >= 80 
                ? "bg-green-50 text-green-700 border-green-200" 
                : dealScore >= 65
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : dealScore >= 50
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-red-50 text-red-700 border-red-200"
            }
          >
            {scoreLabel}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
