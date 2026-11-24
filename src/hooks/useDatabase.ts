import { useSyncExternalStore } from 'react';
import { db } from '../services/db/database';

const subscribe = (listener: () => void) => db.subscribe(listener);
const getSnapshot = () => db.getVersion();

/**
 * Subscribes a component to reactive updates from the underlying database store.
 */
export function useDatabaseVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
