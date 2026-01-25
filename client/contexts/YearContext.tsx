import React, { createContext, useContext, useState, useEffect } from 'react';

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export const YearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentYear = new Date().getFullYear();
  
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('selectedYear');
    return saved ? parseInt(saved, 10) : currentYear;
  });

  // Generate available years: Current year + 5 years ahead
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

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
