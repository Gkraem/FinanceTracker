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
  grossAnnualSalary: number,
  current401k: number,
  currentRothIRA: number,
  otherInvestments: number,
  contribution401kPercent: number,
  companyMatchPercent: number,
  promotionPercentage: number,
  monthlySavings: number,
  nominalReturn: number = 0.07,
  inflationRate: number = 0.03
): { 
  projectedSavings: number; 
  monthlyIncome: number;
  projected401k: number;
  projectedRothIRA: number;
  projectedOtherInvestments: number;
  calculationSteps: string[];
} {
  const yearsToRetirement = retirementAge - currentAge;
  
  // Real growth rate = ((1 + nominal) / (1 + inflation)) - 1
  const realGrowthRate = ((1 + nominalReturn) / (1 + inflationRate)) - 1;
  
  const calculationSteps: string[] = [];
  
  calculationSteps.push(`🏁 Starting Values:`);
  calculationSteps.push(`Current Age: ${currentAge}`);
  calculationSteps.push(`Retirement Age: ${retirementAge}`);
  calculationSteps.push(`Years to Retirement: ${yearsToRetirement}`);
  calculationSteps.push(`Starting Salary: ${formatCurrency(grossAnnualSalary)}`);
  calculationSteps.push(`401k Contribution: ${contribution401kPercent}%`);
  calculationSteps.push(`Company Match: ${companyMatchPercent}%`);
  calculationSteps.push(`Annual Raise: ${promotionPercentage}%`);
  calculationSteps.push(`Monthly Savings: ${formatCurrency(monthlySavings)}`);
  calculationSteps.push(`Real Growth Rate: ${(realGrowthRate * 100).toFixed(2)}%`);
  calculationSteps.push('');
  
  calculationSteps.push(`📊 Current Balances:`);
  calculationSteps.push(`401k Balance: ${formatCurrency(current401k)}`);
  calculationSteps.push(`Roth IRA Balance: ${formatCurrency(currentRothIRA)}`);
  calculationSteps.push(`Other Investments: ${formatCurrency(otherInvestments)}`);
  calculationSteps.push('');
  
  // Track each account separately
  let salary = grossAnnualSalary;
  let balance401k = current401k;
  let balanceRothIRA = currentRothIRA;
  let balanceOtherInvestments = otherInvestments;
  let currentMonthlySavings = monthlySavings;
  
  const rothIRALimit = 7000; // Annual limit
  
  calculationSteps.push(`📈 Year-by-Year Calculation:`);
  
  // Calculate each year
  for (let year = 1; year <= yearsToRetirement; year++) {
    // 1. Salary Growth
    salary = salary * (1 + promotionPercentage / 100);
    
    // 2. 401k Contributions and Growth
    const employee401kContrib = salary * (contribution401kPercent / 100);
    const companyMatch = salary * (companyMatchPercent / 100);
    balance401k = (balance401k + employee401kContrib + companyMatch) * (1 + realGrowthRate);
    
    // 3. Roth IRA Growth
    balanceRothIRA = (balanceRothIRA + rothIRALimit) * (1 + realGrowthRate);
    
    // 4. Other Investments Growth (including monthly savings)
    // Calculate remaining monthly savings after 401k and Roth IRA
    const totalRetirementContribs = employee401kContrib + companyMatch + rothIRALimit;
    const remainingMonthlySavings = Math.max(0, currentMonthlySavings * 12 - totalRetirementContribs);
    
    balanceOtherInvestments = (balanceOtherInvestments + remainingMonthlySavings) * (1 + realGrowthRate);
    
    // Monthly savings grow with salary
    currentMonthlySavings = currentMonthlySavings * (1 + promotionPercentage / 100);
    
    // Show first 5 years and last year
    if (year <= 5 || year === yearsToRetirement) {
      calculationSteps.push(`Year ${year}:`);
      calculationSteps.push(`  Salary: ${formatCurrency(salary)}`);
      calculationSteps.push(`  401k: ${formatCurrency(balance401k)} (+ ${formatCurrency(employee401kContrib + companyMatch)})`);
      calculationSteps.push(`  Roth: ${formatCurrency(balanceRothIRA)} (+ ${formatCurrency(rothIRALimit)})`);
      calculationSteps.push(`  Other: ${formatCurrency(balanceOtherInvestments)} (+ ${formatCurrency(remainingMonthlySavings)})`);
      calculationSteps.push('');
    } else if (year === 6) {
      calculationSteps.push('... (continuing calculations for all years)');
      calculationSteps.push('');
    }
  }
  
  const projectedSavings = balance401k + balanceRothIRA + balanceOtherInvestments;
  
  calculationSteps.push(`💰 Final Results at Age ${retirementAge}:`);
  calculationSteps.push(`401k Balance: ${formatCurrency(balance401k)}`);
  calculationSteps.push(`Roth IRA Balance: ${formatCurrency(balanceRothIRA)}`);
  calculationSteps.push(`Other Investments: ${formatCurrency(balanceOtherInvestments)}`);
  calculationSteps.push(`Total Net Worth: ${formatCurrency(projectedSavings)}`);
  calculationSteps.push('');
  
  // 4% rule for retirement income
  const monthlyIncome = (projectedSavings * 0.04) / 12;
  calculationSteps.push(`🏖️ Monthly Retirement Income (4% rule):`);
  calculationSteps.push(`${formatCurrency(projectedSavings)} × 4% ÷ 12 = ${formatCurrency(monthlyIncome)}`);
  
  return {
    projectedSavings,
    monthlyIncome,
    projected401k: balance401k,
    projectedRothIRA: balanceRothIRA,
    projectedOtherInvestments: balanceOtherInvestments,
    calculationSteps,
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
  income: any,
  expenses: any[]
): { amount: number; percentage: number; status: 'positive' | 'negative' | 'break-even' } {
  if (!income) return { amount: 0, percentage: 0, status: 'break-even' };

  const grossAnnual = parseFloat(income.annualSalary || "0");
  const taxCalc = calculateTax(grossAnnual, income.state);
  const contribution401k = parseFloat(income.contribution401k || "0");
  
  // Calculate net monthly income (after taxes and 401k)
  const contribution401kAmount = grossAnnual * (contribution401k / 100);
  const netAnnual = grossAnnual - taxCalc.federal - taxCalc.state - taxCalc.fica - contribution401kAmount;
  const netMonthly = netAnnual / 12;
  
  const monthlyExpenses = Array.isArray(expenses) ? expenses.reduce((sum, expense) => 
    sum + parseFloat(expense.amount), 0
  ) : 0;

  const amount = netMonthly - monthlyExpenses;
  const percentage = netMonthly > 0 ? (amount / netMonthly) * 100 : 0;
  
  let status: 'positive' | 'negative' | 'break-even' = 'break-even';
  if (amount > 0) status = 'positive';
  else if (amount < 0) status = 'negative';
  
  return { amount, percentage, status };
}
