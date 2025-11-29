import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface YBYScoreProps {
  score: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * YBYScore - Selo de avaliação da YBYBID
 * 
 * Calcula risco x preço (nota de 0-100)
 * Componente visual exclusivo da marca
 */
export function YBYScore({ score, className, size = "md" }: YBYScoreProps) {
  const getScoreLabel = (score: number): { label: string; color: string } => {
    if (score >= 80) {
      return { label: "Excelente", color: "bg-approval-green text-white" };
    } else if (score >= 65) {
      return { label: "Bom Negócio", color: "bg-petrol text-white" };
    } else if (score >= 50) {
      return { label: "Preço Justo", color: "bg-signal-orange text-white" };
    } else {
      return { label: "Avaliar", color: "bg-muted text-muted-foreground" };
    }
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const { label, color } = getScoreLabel(score);

  return (
    <Badge
      className={cn(
        "font-display font-bold rounded-md border-0",
        color,
        sizeClasses[size],
        className
      )}
    >
      <span className="font-heading mr-1">YBY</span>
      {score}/100 • {label}
    </Badge>
  );
}

