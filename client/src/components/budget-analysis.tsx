import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, PieChart, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, calculateMonthlyCashFlow, calculateTax } from "@/lib/utils";
import type { IncomeData, Expense } from "@shared/schema";

interface IncomeResponse {
  income: IncomeData | null;
}

interface ExpensesResponse {
  expenses: Expense[];
}

interface CategorySpending {
  category: string;
  amount: number;
  budget: number;
  percentage: number;
  status: "good" | "warning" | "over";
}

const CATEGORY_BUDGETS: Record<string, number> = {
  "Rent": 0.30, // 30% of income
  "Groceries": 0.10, // 10% of income
  "Transportation": 0.15, // 15% of income
  "Entertainment": 0.05, // 5% of income
  "Healthcare": 0.08, // 8% of income
  "Utilities": 0.06, // 6% of income
  "Insurance": 0.10, // 10% of income
  "Student Debt": 0.10, // 10% of income
  "Shopping": 0.06, // 6% of income
};

export default function BudgetAnalysis() {
  const { data: incomeData, isLoading: incomeLoading } = useQuery<IncomeResponse>({
    queryKey: ["/api/income"],
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery<ExpensesResponse>({
    queryKey: ["/api/expenses"],
  });

  if (incomeLoading || expensesLoading) {
    return (
      <Card className="shadow-sm border animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Budget Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const income = incomeData?.income;
  const expenses = expensesData?.expenses || [];

  // Calculate net monthly income (after taxes and 401k)
  const grossAnnual = income ? parseFloat(income.annualSalary) : 0;
  const grossMonthly = grossAnnual / 12;
  const taxes = income ? calculateTax(grossAnnual, income.state) : { federal: 0, state: 0, fica: 0 };
  const contribution401k = income?.contribution401k ? parseFloat(income.contribution401k) / 12 : 0;
  const netMonthlyIncome = grossMonthly - (taxes.federal / 12) - (taxes.state / 12) - (taxes.fica / 12) - contribution401k;
  const monthlyExpenses = expenses.reduce((total, expense) => {
    const amount = parseFloat(expense.amount);
    switch (expense.frequency) {
      case "monthly":
        return total + amount;
      case "weekly":
        return total + amount * 4.33;
      case "bi-weekly":
        return total + amount * 2.17;
      case "one-time":
        return total + amount / 12;
      default:
        return total + amount;
    }
  }, 0);

  const cashFlow = netMonthlyIncome - monthlyExpenses;

  // Group expenses by category
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((expense) => {
    const amount = parseFloat(expense.amount);
    let monthlyAmount = amount;
    
    switch (expense.frequency) {
      case "weekly":
        monthlyAmount = amount * 4.33;
        break;
      case "bi-weekly":
        monthlyAmount = amount * 2.17;
        break;
      case "one-time":
        monthlyAmount = amount / 12;
        break;
    }
    
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + monthlyAmount;
  });

  // Calculate category spending analysis
  const categoryAnalysis: CategorySpending[] = Object.entries(categoryTotals).map(([category, amount]) => {
    const budgetPercentage = CATEGORY_BUDGETS[category] || 0.05;
    const budget = netMonthlyIncome * budgetPercentage;
    const percentage = budget > 0 ? (amount / budget) * 100 : 0;
    
    let status: "good" | "warning" | "over" = "good";
    if (percentage > 100) status = "over";
    else if (percentage > 85) status = "warning";
    
    return {
      category,
      amount,
      budget,
      percentage,
      status,
    };
  });

  // Sort by spending amount
  categoryAnalysis.sort((a, b) => b.amount - a.amount);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-primary";
      case "warning":
        return "text-chart-4";
      case "over":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "good":
        return "bg-primary";
      case "warning":
        return "bg-chart-4";
      case "over":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const recommendations = [
    cashFlow.status === "positive" && cashFlow.amount > 1000
      ? `You could save an additional ${formatCurrency(cashFlow.amount * 0.5)}/month`
      : null,
    categoryAnalysis.find(c => c.status === "over")
      ? `Consider reducing spending in ${categoryAnalysis.find(c => c.status === "over")?.category}`
      : null,
    monthlyIncome > 0 && monthlyExpenses / monthlyIncome < 0.5
      ? "Your spending is well within healthy ranges"
      : null,
    income && parseFloat(income.annualSalary) > 0
      ? `Your emergency fund target: ${formatCurrency(monthlyExpenses * 6)}`
      : null,
  ].filter(Boolean);

  return (
    <Card className="shadow-sm border animate-slide-up">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center space-x-2">
          <PieChart className="h-5 w-5 text-primary" />
          <span>Budget Analysis</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Monthly Cash Flow */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Monthly Cash Flow</span>
            <div className="flex items-center space-x-2">
              {cashFlow.status === "positive" ? (
                <TrendingUp className="h-4 w-4 text-primary" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={`text-lg font-bold ${
                cashFlow.status === "positive" ? "text-primary" : "text-destructive"
              }`}>
                {cashFlow.status === "positive" ? "+" : ""}{formatCurrency(cashFlow.amount)}
              </span>
            </div>
          </div>
          
          <Progress 
            value={Math.max(0, Math.min(100, 50 + cashFlow.percentage))}
            className="h-3"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Income: {formatCurrency(monthlyIncome)}</span>
            <span>Expenses: {formatCurrency(monthlyExpenses)}</span>
          </div>
        </div>

        {/* Spending Categories */}
        {categoryAnalysis.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-medium text-card-foreground">Spending Breakdown</h4>
            
            <div className="space-y-3">
              {categoryAnalysis.slice(0, 6).map((category) => (
                <div key={category.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{category.category}</span>
                    <span className="text-card-foreground font-medium">
                      {formatCurrency(category.amount)} / {formatCurrency(category.budget)}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <Progress 
                      value={Math.min(100, category.percentage)}
                      className="h-2"
                    />
                    <div 
                      className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${getProgressColor(category.status)}`}
                      style={{ width: `${Math.min(100, category.percentage)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-xs ${getStatusColor(category.status)}`}>
                      {category.percentage.toFixed(0)}% of budget
                    </span>
                    <span className={`text-xs ${getStatusColor(category.status)}`}>
                      {category.status === "good" && "Within budget"}
                      {category.status === "warning" && "Close to limit"}
                      {category.status === "over" && `${formatCurrency(category.amount - category.budget)} over budget`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Add some expenses to see your budget analysis
            </p>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-gradient-to-r from-primary/5 to-chart-2/5 rounded-lg p-4 border">
            <h4 className="font-medium text-card-foreground mb-2 flex items-center">
              <Lightbulb className="h-4 w-4 mr-2 text-chart-4" />
              Smart Recommendations
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
