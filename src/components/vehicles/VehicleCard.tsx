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
  const scoreColor = getScoreBadgeColor(vehicle.deal_score);
  const scoreLabel = getScoreLabel(vehicle.deal_score);
  
  const descontoFipe = vehicle.fipe_preco 
    ? Math.round(((vehicle.fipe_preco - vehicle.preco_atual) / vehicle.fipe_preco) * 100)
    : 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <div className="relative h-48 bg-gray-200">
        <Badge className={`absolute top-2 right-2 ${scoreColor} text-white`}>
          Score: {vehicle.deal_score}
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
        {vehicle.imagens && vehicle.imagens.length > 0 ? (
          <Image
            src={vehicle.imagens[0]}
            alt={vehicle.titulo}
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
        <h3 className="font-semibold mb-2 line-clamp-2">{vehicle.titulo}</h3>
        
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{vehicle.cidade}, {vehicle.estado}</span>
          </div>
          
          {vehicle.data_leilao && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Leilão: {new Date(vehicle.data_leilao).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
          
          {vehicle.km && (
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 flex-shrink-0" />
              <span>{vehicle.km.toLocaleString('pt-BR')} km</span>
            </div>
          )}
          
          {(vehicle.combustivel || vehicle.cambio) && (
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {vehicle.combustivel} {vehicle.cambio && `• ${vehicle.cambio}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(vehicle.preco_atual)}
            </p>
            {vehicle.fipe_preco && (
              <p className="text-xs text-muted-foreground">
                FIPE: {formatCurrency(vehicle.fipe_preco)} 
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
              vehicle.deal_score >= 80 
                ? "bg-green-50 text-green-700 border-green-200" 
                : vehicle.deal_score >= 65
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : vehicle.deal_score >= 50
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
