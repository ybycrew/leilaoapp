'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface SearchChipsProps {
  searchTerms: string[];
  onRemove: (term: string) => void;
}

export function SearchChips({ searchTerms, onRemove }: SearchChipsProps) {
  if (!searchTerms || searchTerms.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {searchTerms.map((term, index) => (
        <Badge
          key={`${term}-${index}`}
          variant="secondary"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
        >
          <span>{term}</span>
          <button
            type="button"
            onClick={() => onRemove(term)}
            className="hover:bg-muted rounded-full p-0.5 transition-colors"
            aria-label={`Remover busca: ${term}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

