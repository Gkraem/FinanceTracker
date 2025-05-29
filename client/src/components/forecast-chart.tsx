import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp } from "lucide-react";
import { generateProjectionData } from "@/lib/utils";
import type { IncomeData, Expense } from "@shared/schema";

// Chart.js imports
declare global {
  interface Window {
    Chart: any;
  }
}

interface IncomeResponse {
  income: IncomeData | null;
}

interface ExpensesResponse {
  expenses: Expense[];
}

const TIMEFRAMES = [
  { value: "1", label: "1Y", years: 1 },
  { value: "5", label: "5Y", years: 5 },
  { value: "10", label: "10Y", years: 10 },
  { value: "20", label: "20Y+", years: 20 },
];

const METRICS = [
  { value: "networth", label: "Net Worth" },
  { value: "401k", label: "401k Growth" },
  { value: "rothira", label: "Roth IRA" },
];

export default function ForecastChart() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("5");
  const [selectedMetric, setSelectedMetric] = useState("networth");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const { data: incomeData } = useQuery<IncomeResponse>({
    queryKey: ["/api/income"],
  });

  const { data: expensesData } = useQuery<ExpensesResponse>({
    queryKey: ["/api/expenses"],
  });

  const { data: assetsData } = useQuery<{assets: any}>({
    queryKey: ["/api/assets"],
  });

  useEffect(() => {
    // Load Chart.js if not already loaded
    if (!window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => initializeChart();
      document.head.appendChild(script);
    } else {
      initializeChart();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [selectedTimeframe, selectedMetric, incomeData, expensesData]);

  const initializeChart = () => {
    if (!chartRef.current || !window.Chart) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const income = incomeData?.income;
    const expenses = expensesData?.expenses || [];

    // Calculate monthly values
    const monthlyIncome = income ? parseFloat(income.annualSalary) / 12 : 0;
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

    const monthlySavings = monthlyIncome - monthlyExpenses;
    const timeframe = TIMEFRAMES.find(t => t.value === selectedTimeframe);
    const years = timeframe?.years || 5;

    let chartData: { year: number; value: number }[] = [];
    let startValue = 185000; // Base net worth
    let monthlyContribution = Math.max(0, monthlySavings);

    switch (selectedMetric) {
      case "networth":
        chartData = generateProjectionData(startValue, monthlyContribution, 0.07, years);
        break;
      case "401k":
        const contribution401k = income ? (parseFloat(income.annualSalary) * parseFloat(income.contribution401k)) / 100 / 12 : 0;
        chartData = generateProjectionData(85000, contribution401k, 0.08, years);
        break;
      case "rothira":
        const rothContribution = income ? parseFloat(income.rothIRA) / 12 : 0;
        chartData = generateProjectionData(25000, rothContribution, 0.07, years);
        break;
    }

    const labels = chartData.map(d => d.year.toString());
    const data = chartData.map(d => d.value);

    chartInstance.current = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: METRICS.find(m => m.value === selectedMetric)?.label || 'Value',
          data,
          borderColor: 'hsl(var(--primary))',
          backgroundColor: 'hsla(var(--primary), 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'hsl(var(--primary))',
          pointBorderColor: 'hsl(var(--background))',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'hsl(var(--popover))',
            titleColor: 'hsl(var(--popover-foreground))',
            bodyColor: 'hsl(var(--popover-foreground))',
            borderColor: 'hsl(var(--border))',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function(context: any) {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: 'hsl(var(--muted-foreground))',
              font: {
                size: 12
              }
            }
          },
          y: {
            grid: {
              color: 'hsla(var(--border), 0.5)'
            },
            ticks: {
              color: 'hsl(var(--muted-foreground))',
              font: {
                size: 12
              },
              callback: function(value: any) {
                if (value >= 1000000) {
                  return '$' + (value / 1000000).toFixed(1) + 'M';
                } else if (value >= 1000) {
                  return '$' + (value / 1000).toFixed(0) + 'K';
                }
                return '$' + value.toFixed(0);
              }
            }
          }
        },
        elements: {
          point: {
            hoverBackgroundColor: 'hsl(var(--primary))'
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  };

  return (
    <Card className="shadow-sm border animate-slide-up">
      <CardHeader className="border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Financial Forecasts</span>
          </CardTitle>
          
          {/* Chart Controls */}
          <div className="flex flex-wrap gap-4">
            {/* Metric Selector */}
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((metric) => (
                  <SelectItem key={metric.value} value={metric.value}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Timeframe Buttons */}
            <div className="flex bg-muted rounded-lg p-1">
              {TIMEFRAMES.map((timeframe) => (
                <Button
                  key={timeframe.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTimeframe(timeframe.value)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${
                    selectedTimeframe === timeframe.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {timeframe.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="relative h-[300px] w-full">
          <canvas ref={chartRef} className="w-full h-full" />
        </div>
        
        {(!incomeData?.income || !expensesData?.expenses?.length) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Add income and expense data to see projections
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
