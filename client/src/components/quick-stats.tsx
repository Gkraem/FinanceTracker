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

  const { data: assetsData, isLoading: assetsLoading } = useQuery<{assets: any}>({
    queryKey: ["/api/assets"],
  });

  if (incomeLoading || expensesLoading || assetsLoading) {
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
  const assets = assetsData?.assets;

  // Calculate net monthly income (exact same calculation as income estimator)
  const monthlyIncome = income ? (() => {
    const salary = parseFloat(income.annualSalary || "0");
    const contribution401kPercent = parseFloat(income.contribution401k || "0");
    const sideHustle = parseFloat(income.sideHustleIncome || "0");
    const grossAnnual = salary + sideHustle;
    const contribution401k = (salary * contribution401kPercent) / 100;
    const taxableIncome = grossAnnual - contribution401k;
    const taxes = calculateTax(taxableIncome, income.state);
    const netAnnual = taxableIncome - taxes.federal - taxes.state - taxes.fica;
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

  const cashFlow = calculateMonthlyCashFlow(income, expenses);
  const savingsRate = monthlyIncome > 0 ? (cashFlow.amount / monthlyIncome) * 100 : 0;

  // Calculate actual net worth from asset tracker data
  const netWorth = assets ? 
    parseFloat(assets.currentCash || "0") +
    parseFloat(assets.current401k || "0") +
    parseFloat(assets.currentRothIRA || "0") +
    parseFloat(assets.homeValue || "0") +
    parseFloat(assets.carValue || "0") +
    parseFloat(assets.personalInvestments || "0") +
    parseFloat(assets.otherAssets || "0")
    : 0;

  const stats = [
    {
      title: "Net Monthly Income",
      value: formatCurrency(monthlyIncome),

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

            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
