'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function SortSelect({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('orderBy', value);
    router.push(`/buscar?${params.toString()}`);
  };

  return (
    <select
      className="text-sm border rounded-md px-3 py-2 cursor-pointer"
      defaultValue={defaultValue || 'deal_score'}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="deal_score">Melhor Score</option>
      <option value="price_asc">Menor Preço</option>
      <option value="price_desc">Maior Preço</option>
      <option value="date_asc">Data Crescente</option>
      <option value="date_desc">Data Decrescente</option>
    </select>
  );
}

