import { useEffect } from 'react';
import { useBudgetStore } from '../stores/useBudgetStore';

export function useBudgetAlerts() {
  const alerts = useBudgetStore((state) => state.alerts);
  const refreshAlerts = useBudgetStore((state) => state.refreshAlerts);
  const month = useBudgetStore((state) => state.month);

  useEffect(() => {
    void refreshAlerts();
  }, [month, refreshAlerts]);

  return alerts;
}
