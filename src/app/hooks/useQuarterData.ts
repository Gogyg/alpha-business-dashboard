import { useState, useEffect } from 'react';

export function useQuarterData<T>(initialData: T, storageKey: string) {
  const [currentQuarter, setCurrentQuarter] = useState('Q1');
  const [quarterData, setQuarterData] = useState<Record<string, T>>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return { Q1: initialData, Q2: initialData, Q3: initialData, Q4: initialData };
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(quarterData));
  }, [quarterData, storageKey]);

  const updateQuarterData = (quarter: string, data: T) => {
    setQuarterData(prev => ({
      ...prev,
      [quarter]: data,
    }));
  };

  const getCurrentData = () => quarterData[currentQuarter] || initialData;

  return {
    currentQuarter,
    setCurrentQuarter,
    quarterData,
    updateQuarterData,
    getCurrentData,
  };
}
