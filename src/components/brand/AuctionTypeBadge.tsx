import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AuctionType = 
  | "judicial" 
  | "alienacao-fiduciaria" 
  | "bank-repo" 
  | "penhora" 
  | "online" 
  | "presencial"
  | "hibrido";

interface AuctionTypeBadgeProps {
  type: AuctionType | string;
  className?: string;
}

/**
 * AuctionTypeBadge - Etiqueta de tipo de leilão
 * 
 * Componente visual para identificar tipo de leilão
 * Estilo premium conforme identidade YBYBID
 */
export function AuctionTypeBadge({ type, className }: AuctionTypeBadgeProps) {
  const getTypeConfig = (type: string): { label: string; color: string } => {
    const typeLower = type.toLowerCase();
    
    if (typeLower.includes("judicial")) {
      return { 
        label: "Leilão Judicial", 
        color: "bg-petrol text-white border-petrol" 
      };
    } else if (typeLower.includes("fiduciária") || typeLower.includes("fiduciaria") || typeLower.includes("alienação") || typeLower.includes("alienacao")) {
      return { 
        label: "Alienação Fiduciária", 
        color: "bg-carbon text-fog border-carbon" 
      };
    } else if (typeLower.includes("bank") || typeLower.includes("repo")) {
      return { 
        label: "Bank Repo", 
        color: "bg-carbon text-fog border-carbon" 
      };
    } else if (typeLower.includes("penhora")) {
      return { 
        label: "Penhorado", 
        color: "bg-carbon text-fog border-carbon" 
      };
    } else if (typeLower.includes("presencial")) {
      return { 
        label: "Presencial", 
        color: "bg-petrol/20 text-petrol border-petrol/30" 
      };
    } else if (typeLower.includes("híbrido") || typeLower.includes("hibrido")) {
      return { 
        label: "Híbrido", 
        color: "bg-petrol/20 text-petrol border-petrol/30" 
      };
    } else {
      return { 
        label: "Online", 
        color: "bg-signal-orange/20 text-signal-orange border-signal-orange/30" 
      };
    }
  };

  const { label, color } = getTypeConfig(type);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-body text-xs font-medium rounded-md border",
        color,
        className
      )}
    >
      {label}
    </Badge>
  );
}

