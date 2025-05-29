import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Target } from "lucide-react";
import { formatCurrency, formatPercentage, calculateTax, calculateMonthlyCashFlow } from "@/lib/utils";
import type { IncomeData, Expense } from "@shared/schema";

interface IncomeResponse {
  income: IncomeData | null;
}

interface ExpensesResponse {
  expenses: Expense[];
}

export default function QuickStats() {
  const { data: incomeData, isLoading: incomeLoading } = useQuery<IncomeResponse>({
    queryKey: ["/api/income"],
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery<ExpensesResponse>({
    queryKey: ["/api/expenses"],
  });

  if (incomeLoading || expensesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shadow-sm border">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24 mb-4" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const income = incomeData?.income;
  const expenses = expensesData?.expenses || [];

  // Calculate net monthly income (after taxes and 401k)
  const monthlyIncome = income ? (() => {
    const grossAnnual = parseFloat(income.annualSalary);
    const taxCalc = calculateTax(grossAnnual, income.state);
    const contribution401k = parseFloat(income.contribution401k || "0");
    const netAnnual = grossAnnual - taxCalc.federal - taxCalc.state - taxCalc.fica - (grossAnnual * contribution401k / 100);
    return netAnnual / 12;
  })() : 0;
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

  const cashFlow = calculateMonthlyCashFlow(monthlyIncome, monthlyExpenses);
  const savingsRate = monthlyIncome > 0 ? (cashFlow.amount / monthlyIncome) * 100 : 0;

  // Mock net worth calculation (would be calculated from assets/investments in real app)
  const netWorth = 185000 + (cashFlow.amount * 12);

  const stats = [
    {
      title: "Monthly Income",
      value: formatCurrency(monthlyIncome),
      change: "+12%",
      trend: "up" as const,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Monthly Expenses",
      value: formatCurrency(monthlyExpenses),
      change: "+5%",
      trend: "up" as const,
      icon: TrendingUp,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Net Worth",
      value: formatCurrency(netWorth),
      change: "+18%",
      trend: "up" as const,
      icon: Target,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Savings Rate",
      value: formatPercentage(savingsRate),
      change: savingsRate > 20 ? "Above target" : "Below target",
      trend: savingsRate > 20 ? ("up" as const) : ("down" as const),
      icon: PiggyBank,
      color: savingsRate > 20 ? "text-primary" : "text-chart-4",
      bgColor: savingsRate > 20 ? "bg-primary/10" : "bg-chart-4/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="shadow-sm border hover:shadow-md transition-shadow duration-200 card-hover"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-card-foreground mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.bgColor} rounded-lg p-3`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {stat.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-primary mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive mr-1" />
                )}
                <span
                  className={
                    stat.trend === "up" ? "text-primary" : "text-destructive"
                  }
                >
                  {stat.change}
                </span>
                <span className="text-muted-foreground ml-2">vs last month</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
