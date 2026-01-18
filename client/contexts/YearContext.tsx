import React, { createContext, useContext, useState, useEffect } from 'react';

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export const YearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // System locked to 2026 only
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    // Always default to 2026
    return 2026;
  });

  // Available years: 2026 only
  const availableYears = [2026];

  // Save selected year to localStorage
  useEffect(() => {
    localStorage.setItem('selectedYear', String(selectedYear));
  }, [selectedYear]);

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear, availableYears }}>
      {children}
    </YearContext.Provider>
  );
};

export const useYear = () => {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error('useYear must be used within YearProvider');
  }
  return context;
};
