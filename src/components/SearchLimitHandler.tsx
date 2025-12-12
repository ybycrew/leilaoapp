'use client';

import { useEffect, useState } from 'react';
import { UpgradeModal } from './UpgradeModal';

interface SearchLimitHandlerProps {
  error?: string | null;
  upgradeRequired?: boolean;
}

export function SearchLimitHandler({ error, upgradeRequired }: SearchLimitHandlerProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Verificar se há erro de limite atingido
    if (error === 'LIMIT_REACHED' || upgradeRequired) {
      setShowModal(true);
    }
  }, [error, upgradeRequired]);

  return <UpgradeModal open={showModal} onOpenChange={setShowModal} />;
}

