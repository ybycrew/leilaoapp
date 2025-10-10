export interface User {
  id: string;
  email: string;
  nome?: string;
  plano: 'gratuito' | 'mensal' | 'anual';
  buscas_restantes: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  vehicle_id: string;
  created_at: Date;
}

export interface UserSearch {
  id: string;
  user_id: string;
  filters: VehicleFilter;
  created_at: Date;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  plano: 'mensal' | 'anual';
  status: 'active' | 'canceled' | 'past_due';
  current_period_start: Date;
  current_period_end: Date;
  created_at: Date;
  updated_at: Date;
}

import { VehicleFilter } from './vehicle';
