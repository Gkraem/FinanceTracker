import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

export function formatPercentage(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num / 100);
}

export function calculateTax(income: number, state: string): { federal: number; state: number; fica: number } {
  // Simplified tax calculation - in production would use proper tax tables
  const federalRate = income > 100000 ? 0.24 : income > 50000 ? 0.22 : 0.12;
  const stateRates: Record<string, number> = {
    'California': 0.093,
    'Texas': 0,
    'New York': 0.0685,
    'Florida': 0,
    'Maryland': 0.0575,
    'Illinois': 0.0495,
  };
  
  const stateRate = stateRates[state] || 0.05;
  const ficaRate = 0.0765; // Social Security + Medicare
  
  return {
    federal: income * federalRate,
    state: income * stateRate,
    fica: income * ficaRate,
  };
}

export function calculateRetirement(
  currentAge: number,
  retirementAge: number,
  currentSavings: number,
  monthlyContribution: number,
  annualReturn: number = 0.07
): { projectedSavings: number; monthlyIncome: number } {
  const yearsToRetirement = retirementAge - currentAge;
  const monthsToRetirement = yearsToRetirement * 12;
  const monthlyReturn = annualReturn / 12;
  
  // Future value of current savings
  const futureValueCurrent = currentSavings * Math.pow(1 + annualReturn, yearsToRetirement);
  
  // Future value of monthly contributions (annuity)
  const futureValueContributions = monthlyContribution * 
    (Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn;
  
  const projectedSavings = futureValueCurrent + futureValueContributions;
  
  // 4% rule for retirement income
  const monthlyIncome = (projectedSavings * 0.04) / 12;
  
  return {
    projectedSavings,
    monthlyIncome,
  };
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateProjectionData(
  startValue: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number
): { year: number; value: number }[] {
  const data: { year: number; value: number }[] = [];
  let currentValue = startValue;
  const monthlyReturn = annualReturn / 12;
  
  for (let year = 0; year <= years; year++) {
    data.push({
      year: new Date().getFullYear() + year,
      value: Math.round(currentValue),
    });
    
    // Add monthly contributions and growth for next year
    for (let month = 0; month < 12; month++) {
      currentValue = (currentValue + monthlyContribution) * (1 + monthlyReturn);
    }
  }
  
  return data;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}

export function calculateMonthlyCashFlow(
  monthlyIncome: number,
  monthlyExpenses: number
): { amount: number; percentage: number; status: 'positive' | 'negative' | 'break-even' } {
  const amount = monthlyIncome - monthlyExpenses;
  const percentage = monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 0;
  
  let status: 'positive' | 'negative' | 'break-even' = 'break-even';
  if (amount > 0) status = 'positive';
  else if (amount < 0) status = 'negative';
  
  return { amount, percentage, status };
}
