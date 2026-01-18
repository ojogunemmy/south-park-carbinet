/**
 * Utility functions for managing year-based data storage in localStorage
 */

const getYearKey = (dataType: string, year: number) => `${dataType}_${year}`;

/**
 * Check if year should use example/seed data
 * 2025 and 2026 use examples; 2027-2030 start fresh
 */
export const shouldUseExampleData = (year: number): boolean => {
  return year === 2025 || year === 2026;
};

/**
 * Get data for a specific year
 */
export const getYearData = <T>(dataType: string, year: number, defaultValue: T): T => {
  try {
    const key = getYearKey(dataType, year);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log(`📂 Loaded ${dataType} for year ${year} - ${key} - Items: ${Array.isArray(parsed) ? parsed.length : 'object'}`);
      return parsed;
    } else {
      console.log(`⚠️ No data found for ${dataType} in year ${year} - Key: ${key}`);
      return defaultValue;
    }
  } catch (error) {
    console.error(`❌ Error loading ${dataType} for year ${year}:`, error);
    return defaultValue;
  }
};

/**
 * Save data for a specific year
 */
export const saveYearData = <T>(dataType: string, year: number, data: T): void => {
  try {
    const key = getYearKey(dataType, year);
    const jsonData = JSON.stringify(data);
    localStorage.setItem(key, jsonData);
    console.log(`✅ Saved ${dataType} for year ${year} - Key: ${key} - Size: ${jsonData.length} bytes`);
  } catch (error) {
    console.error(`❌ Error saving ${dataType} for year ${year}:`, error);
    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError') {
        console.error('💾 localStorage FULL - Cannot save more data!');
      }
    }
  }
};

/**
 * Migrate data from old format (no year) to new format (with year)
 * This is for the initial migration from 2025 data
 */
export const migrateDataToYear = (
  dataType: string,
  year: number = 2025
): boolean => {
  try {
    const oldData = localStorage.getItem(dataType);
    if (oldData) {
      const key = getYearKey(dataType, year);
      // Check if year-specific data already exists
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, oldData);
        // Keep the old key for backward compatibility during transition
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`Error migrating ${dataType} to year ${year}:`, error);
    return false;
  }
};

/**
 * Get all years that have data for a specific dataType
 */
export const getYearsWithData = (dataType: string): number[] => {
  const years: number[] = [];
  for (let year = 2025; year <= 2030; year++) {
    const key = getYearKey(dataType, year);
    if (localStorage.getItem(key)) {
      years.push(year);
    }
  }
  return years;
};

/**
 * Clear all year-specific data for a dataType
 */
export const clearYearData = (dataType: string, year: number): void => {
  try {
    const key = getYearKey(dataType, year);
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing ${dataType} for year ${year}:`, error);
  }
};

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 * This prevents UTC timezone shifts that cause dates to appear off by one day
 */
export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a date string (YYYY-MM-DD) to a readable locale string without timezone issues
 * Avoids the UTC timezone shift that causes dates to appear off by one day
 */
export const formatDateString = (dateStr: string): string => {
  if (!dateStr) return '';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  // Create a date using local timezone (not UTC)
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
};

/**
 * Format a Date object to YYYY-MM-DD string without timezone issues
 * This replaces toISOString().split('T')[0] which causes UTC timezone shifts
 * Always uses local timezone to ensure consistent date representation
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generate a short, readable ID (e.g., EXP-A1B2C3)
 * Creates a compact, unique ID from the current timestamp
 */
export const generateShortId = (prefix: string = 'EXP'): string => {
  const timestamp = Date.now();
  // Create a short alphanumeric ID from timestamp
  const shortId = timestamp.toString(36).toUpperCase().slice(-6);
  return `${prefix}-${shortId}`;
};

/**
 * Get the start date of the current week (Sunday)
 */
export const getWeekStartDate = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));

  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const dateNum = String(weekStart.getDate()).padStart(2, '0');
  return `${year}-${month}-${dateNum}`;
};

/**
 * Check if today is Wednesday and generate automatic weekly payments for employees
 * This function should be called on component load to ensure payments are generated
 * @param employees Array of employees to generate payments for
 * @param weeklyPayments Current list of weekly payments
 * @param year Current year for data storage
 * @returns Array of newly generated payments (empty if none were generated)
 */
export const generateWednesdayPayments = (
  employees: any[],
  weeklyPayments: any[],
  year: number
): any[] => {
  // Get today's date (needed for employee start date checks)
  const today = new Date();

  // For 2026: Always start from January 4, 2026 (Sunday)
  // Weeks run Sunday to Saturday
  // For other years: Use current Sunday
  let weekStartDate: string;

  if (year === 2026) {
    // Start from January 7, 2026 (Wednesday) - first payment date
    // Weeks run Sunday to Saturday, so Jan 7 week is Sunday Jan 4 to Saturday Jan 10
    const jan7WeekStart = '2026-01-04'; // Sunday of the week containing Jan 7
    if (!weeklyPayments.some(p => p.weekStartDate === jan7WeekStart)) {
      weekStartDate = jan7WeekStart;
    } else {
      // Find next Sunday without a full payment set
      let checkDate = new Date(2026, 0, 11); // Next Sunday after Jan 4
      const paidWeeks = new Set(weeklyPayments.map(p => p.weekStartDate));

      while (paidWeeks.has(formatDateToString(checkDate))) {
        checkDate.setDate(checkDate.getDate() + 7);
      }
      weekStartDate = formatDateToString(checkDate);
    }
  } else {
    // For other years, use the current Sunday
    const dayOfWeek = today.getDay();

    // Only generate payments on Sunday (day 0)
    if (dayOfWeek !== 0) {
      return [];
    }
    weekStartDate = getWeekStartDate();
  }

  const newPayments: any[] = [];

  // Get active employees who are supposed to be paid on Wednesday
  // AND whose payment start date has already arrived
  const activeEmployees = employees.filter((emp) => {
    if (emp.paymentStatus !== 'active' || emp.paymentDay !== 'wednesday') {
      return false;
    }

    // Check if employee's payment start date has arrived
    if (emp.paymentStartDate) {
      const paymentStartDateParts = emp.paymentStartDate.split('-');
      const paymentStartDate = new Date(
        parseInt(paymentStartDateParts[0], 10),
        parseInt(paymentStartDateParts[1], 10) - 1,
        parseInt(paymentStartDateParts[2], 10)
      );

      if (today < paymentStartDate) {
        return false; // Employee hasn't reached payment start date yet
      }
    }

    return true;
  });

  // For each active employee, check if a payment already exists for this week
  activeEmployees.forEach((employee) => {
    const existingPayment = weeklyPayments.find(
      (p) => p.employeeId === employee.id && p.weekStartDate === weekStartDate
    );

    // Only create a payment if one doesn't already exist
    if (!existingPayment) {
      const newPayment = {
        id: `PAY-${employee.id}-${Date.now()}`,
        employeeId: employee.id,
        weekStartDate: weekStartDate,
        daysWorked: 5,
        weeklyRate: employee.weeklyRate,
        calculatedAmount: employee.weeklyRate,
        finalAmount: employee.weeklyRate,
        status: 'pending' as const,
        paymentMethod: employee.paymentMethod || 'cash',
        bankName: employee.bankName,
        routingNumber: employee.routingNumber,
        accountNumber: employee.accountNumber,
        accountType: employee.accountType,
        checkNumber: employee.checkNumber,
      };

      newPayments.push(newPayment);
    }
  });

  // Save the new payments if any were created
  if (newPayments.length > 0) {
    const allPayments = [...weeklyPayments, ...newPayments];
    saveYearData('weeklyPayments', year, allPayments);
  }

  return newPayments;
};

/**
 * Generate all weekly payments for 2026 starting from January 7, 2026
 * Creates payment records for all weeks throughout the year
 * @param employees Array of employees to generate payments for
 * @param weeklyPayments Current list of weekly payments
 * @param year Current year (should be 2026)
 * @returns Array of newly generated payments
 */
export const generateAllPaymentsForYear = (
  employees: any[],
  weeklyPayments: any[],
  year: number
): any[] => {
  if (year !== 2026) {
    return [];
  }

  const newPayments: any[] = [];

  // Start from January 4, 2026 (Sunday of the week containing Jan 7)
  // Generate payments for every Sunday through the end of 2026
  let currentDate = new Date(2026, 0, 4); // January 4, 2026 (Sunday)
  const endOfYear = new Date(2026, 11, 31); // December 31, 2026

  const paidWeeks = new Set(weeklyPayments.map(p => p.weekStartDate));

  while (currentDate <= endOfYear) {
    const weekStartString = formatDateToString(currentDate);

    // Only generate if this week doesn't already have payments
    if (!paidWeeks.has(weekStartString)) {
      // Get active employees
      const activeEmployees = employees.filter((emp) => {
        if (emp.paymentStatus !== 'active') {
          return false;
        }

        // Check if employee's payment start date has arrived (by the week start date)
        if (emp.paymentStartDate) {
          const paymentStartDateParts = emp.paymentStartDate.split('-');
          const paymentStartDate = new Date(
            parseInt(paymentStartDateParts[0], 10),
            parseInt(paymentStartDateParts[1], 10) - 1,
            parseInt(paymentStartDateParts[2], 10)
          );

          // Compare week start date with payment start date, not today's date
          if (currentDate < paymentStartDate) {
            return false; // Payment week hasn't reached the payment start date yet
          }
        }

        return true;
      });

      // Create payments for each active employee
      activeEmployees.forEach((employee) => {
        const weekEndDate = new Date(currentDate);
        weekEndDate.setDate(currentDate.getDate() + 8); // Monday of next week
        const weekEndString = formatDateToString(weekEndDate);

        const newPayment = {
          id: `PAY-${employee.id}-${weekStartString}`,
          employeeId: employee.id,
          weekStartDate: weekStartString,
          weekEndDate: weekEndString,
          daysWorked: 5,
          weeklyRate: employee.weeklyRate,
          calculatedAmount: employee.weeklyRate,
          finalAmount: employee.weeklyRate,
          status: 'pending' as const,
          paymentMethod: employee.paymentMethod || 'cash',
          bankName: employee.bankName,
          routingNumber: employee.routingNumber,
          accountNumber: employee.accountNumber,
          accountType: employee.accountType,
          checkNumber: employee.checkNumber,
        };

        newPayments.push(newPayment);
        paidWeeks.add(weekStartString);
      });
    }

    // Move to next Sunday
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Save all payments if any were created
  if (newPayments.length > 0) {
    const allPayments = [...weeklyPayments, ...newPayments];
    saveYearData('weeklyPayments', year, allPayments);
  }

  return newPayments;
};
