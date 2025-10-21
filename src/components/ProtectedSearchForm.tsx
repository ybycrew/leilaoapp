'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ProtectedSearchFormProps {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function ProtectedSearchForm({ 
  defaultValue = '', 
  placeholder = 'Buscar veículos...',
  className = ''
}: ProtectedSearchFormProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Se ainda está carregando, não fazer nada
    if (loading) return;
    
    // Se não está logado, redirecionar para planos
    if (!user) {
      router.push('/planos');
      return;
    }
    
    // Se está logado, fazer a busca
    const formData = new FormData(e.currentTarget);
    const query = formData.get('q') as string;
    
    if (query.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input 
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="pl-10"
          disabled={loading}
        />
      </div>
    </form>
  );
}
