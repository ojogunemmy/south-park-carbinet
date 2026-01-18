import { useEffect, useRef } from 'react';
import { saveYearData } from '@/utils/yearStorage';

interface UseAutoSaveOptions {
  data: any;
  key: string;
  year: number;
  debounceMs?: number;
}

/**
 * Custom hook for automatic saving of data to localStorage
 * Debounces saves to avoid excessive writes
 */
export const useAutoSave = ({ data, key, year, debounceMs = 500 }: UseAutoSaveOptions) => {
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer to save after debounce period
    debounceTimerRef.current = setTimeout(() => {
      if (data) {
        saveYearData(key, year, data);
      }
    }, debounceMs);

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, key, year, debounceMs]);
};
