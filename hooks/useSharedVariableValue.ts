import { useMemo } from 'react';
import { useFindValues } from './useData';
import { SIM_SHARED_ITEM_ID, useSim } from '../contexts/SimContext';

export const useSharedVariableValue = <T>({
  key,
  defaultValue,
  userIds,
}: {
  key: string;
  defaultValue: T;
  userIds?: string[];
}) => {
  const sim = useSim();
  // Sim: shared variables live on the 'sim:shared' item. Persona-scoped
  // items at the same key (auto-created when a persona tree mounts a
  // writable useValue on a shared key) must not shadow the shared record,
  // so select it explicitly instead of relying on newest-first order.
  const records = useFindValues<T>(key, {
    itemId: sim.mode !== 'off' ? SIM_SHARED_ITEM_ID : undefined,
    userIds,
    returnTop: 1,
  });

  return useMemo(() => {
    const record = records?.[0];
    return {
      record,
      value: (record?.value ?? defaultValue) as T,
      isLoading: records === undefined,
    };
  }, [defaultValue, records]);
};
