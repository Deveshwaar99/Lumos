import { useEffect } from 'react';
import { useBudgetStore } from '../stores/useBudgetStore';

export function useBudgetAlerts() {
  const { alerts, refreshAlerts, month } = useBudgetStore();

  useEffect(() => {
    refreshAlerts();
  }, [month]);

  return alerts;
}
