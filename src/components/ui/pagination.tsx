"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl?: string;
  searchParams?: Record<string, string | string[] | undefined>;
}

export function Pagination({ currentPage, totalPages, baseUrl = "/buscar", searchParams = {} }: PaginationProps) {
  // Função para construir URL mantendo os parâmetros de busca
  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    
    // Adicionar todos os parâmetros de busca, exceto 'page'
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== "page" && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });
    
    // Adicionar a página (se não for a primeira)
    if (page > 1) {
      params.set("page", page.toString());
    }
    
    const queryString = params.toString();
    return `${baseUrl}${queryString ? `?${queryString}` : ""}`;
  };

  if (totalPages <= 1) {
    return null;
  }

  const pages: (number | "ellipsis")[] = [];
  const maxVisiblePages = 7;

  if (totalPages <= maxVisiblePages) {
    // Mostrar todas as páginas se houver poucas
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Lógica para mostrar páginas com ellipsis
    if (currentPage <= 3) {
      // Início: 1, 2, 3, 4, ..., último
      for (let i = 1; i <= 4; i++) {
        pages.push(i);
      }
      pages.push("ellipsis");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Fim: 1, ..., penúltimo-2, penúltimo-1, penúltimo, último
      pages.push(1);
      pages.push("ellipsis");
      for (let i = totalPages - 3; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Meio: 1, ..., atual-1, atual, atual+1, ..., último
      pages.push(1);
      pages.push("ellipsis");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push("ellipsis");
      pages.push(totalPages);
    }
  }

  return (
    <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginação">
      {/* Botão Anterior */}
      <Link href={buildUrl(Math.max(1, currentPage - 1))}>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
      </Link>

      {/* Páginas */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <div
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </div>
            );
          }

          const isActive = page === currentPage;

          return (
            <Link key={page} href={buildUrl(page)}>
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(
                  "min-w-[2.5rem]",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                {page}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Botão Próximo */}
      <Link href={buildUrl(Math.min(totalPages, currentPage + 1))}>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          className="gap-1"
        >
          Próximo
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    </nav>
  );
}

