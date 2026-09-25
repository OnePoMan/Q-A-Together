import { useState, useCallback } from 'react';
import { readJson, writeJson } from '../lib/storage';

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() =>
    readJson<T>(key, initialValue instanceof Function ? initialValue() : initialValue),
  );

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue(prev => {
        const next = value instanceof Function ? value(prev) : value;
        writeJson(key, next);
        return next;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
