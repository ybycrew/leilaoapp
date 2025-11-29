import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Search, TrendingDown } from "lucide-react";

interface CTAProps {
  variant?: "hero" | "opportunities" | "discover" | "safe-lance";
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * CTAs da YBYBID - Call to Actions perfeitas para leilão
 * 
 * Variantes:
 * - hero: "Todos os leilões do Brasil. Um só lugar."
 * - opportunities: "Ver oportunidades agora"
 * - discover: "Descobrir veículos abaixo da FIPE"
 * - safe-lance: "Quero meu primeiro lance seguro"
 */
export function CTA({ variant = "opportunities", className, onClick, children }: CTAProps) {
  const variants = {
    hero: {
      text: "Todos os leilões do Brasil. Um só lugar.",
      icon: Search,
      className: "text-lg md:text-2xl font-heading",
    },
    opportunities: {
      text: "Ver oportunidades agora",
      icon: Search,
      className: "font-display font-semibold",
    },
    discover: {
      text: "Descobrir veículos abaixo da FIPE",
      icon: TrendingDown,
      className: "font-display font-semibold",
    },
    "safe-lance": {
      text: "Quero meu primeiro lance seguro",
      icon: ArrowRight,
      className: "font-display font-semibold",
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <Button
      onClick={onClick}
      className={cn(
        "bg-signal-orange hover:bg-signal-orange/90 text-white",
        "font-heading tracking-wide",
        "transition-all duration-200",
        "shadow-lg hover:shadow-xl hover:scale-105",
        config.className,
        className
      )}
      size={variant === "hero" ? "lg" : "default"}
    >
      {children || (
        <>
          {config.text}
          <Icon className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

