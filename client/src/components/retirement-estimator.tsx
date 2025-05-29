import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRetirementPlanSchema, type RetirementPlan, type InsertRetirementPlan } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Umbrella, Settings, Loader2, TrendingUp } from "lucide-react";
import { formatCurrency, calculateRetirement, calculateTax } from "@/lib/utils";
import type { IncomeData, Expense, Assets } from "@shared/schema";

interface RetirementResponse {
  plan: RetirementPlan | null;
}

interface IncomeResponse {
  income: IncomeData | null;
}

interface ExpensesResponse {
  expenses: Expense[];
}

interface AssetsResponse {
  assets: Assets | null;
}

export default function RetirementEstimator() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: retirementData, isLoading } = useQuery<RetirementResponse>({
    queryKey: ["/api/retirement"],
  });

  const { data: incomeData } = useQuery<IncomeResponse>({
    queryKey: ["/api/income"],
  });

  const { data: expensesData } = useQuery<ExpensesResponse>({
    queryKey: ["/api/expenses"],
  });

  const { data: assetsData } = useQuery<AssetsResponse>({
    queryKey: ["/api/assets"],
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Omit<InsertRetirementPlan, "userId">>({
    resolver: zodResolver(insertRetirementPlanSchema.omit({ userId: true })),
    defaultValues: {
      currentAge: 30,
      targetRetirementAge: 65,
      expectedReturn: "7.0",
      inflationRate: "3.0",
      withdrawalRate: "4.0",
      targetNetWorth: "",
      promotionPercentage: "3.0",
    },
  });

  const updateRetirementPlanMutation = useMutation({
    mutationFn: async (data: Omit<InsertRetirementPlan, "userId">) => {
      const response = await apiRequest("POST", "/api/retirement", data);
      return response.json() as Promise<RetirementResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retirement"] });
      setIsDialogOpen(false);
      toast({
        title: "Retirement plan updated",
        description: "Your retirement plan has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update retirement plan.",
        variant: "destructive",
      });
    },
  });

  // Load existing data when component mounts
  useEffect(() => {
    if (retirementData?.plan) {
      const plan = retirementData.plan;
      reset({
        currentAge: plan.currentAge || 30,
        targetRetirementAge: plan.targetRetirementAge,
        expectedReturn: plan.expectedReturn,
        inflationRate: plan.inflationRate,
        withdrawalRate: plan.withdrawalRate,
        targetNetWorth: plan.targetNetWorth || "",
        promotionPercentage: plan.promotionPercentage || "3.0",
      });
    }
  }, [retirementData, reset]);

  const onSubmit = (data: Omit<InsertRetirementPlan, "userId">) => {
    updateRetirementPlanMutation.mutate(data);
  };

  // Calculate retirement metrics
  const income = incomeData?.income;
  const expenses = expensesData?.expenses || [];
  const assets = assetsData?.assets;
  const currentAge = retirementData?.plan?.currentAge || 30;

  // Calculate net monthly income (same as budget analysis)
  const salary = income ? parseFloat(income.annualSalary || "0") : 0;
  const contribution401kPercent = income ? parseFloat(income.contribution401k || "0") : 0;
  const sideHustle = income ? parseFloat(income.sideHustleIncome || "0") : 0;
  const state = income?.state || "California";
  
  const grossAnnual = salary + sideHustle;
  const contribution401k = (salary * contribution401kPercent) / 100;
  const taxableIncome = grossAnnual - contribution401k;
  const taxes = grossAnnual > 0 ? calculateTax(taxableIncome, state) : { federal: 0, state: 0, fica: 0 };
  const netAnnual = taxableIncome - taxes.federal - taxes.state - taxes.fica;
  const netMonthlyIncome = netAnnual / 12;

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

  const monthlySavings = Math.max(0, netMonthlyIncome - monthlyExpenses);
  
  // Calculate current net worth from actual asset data
  const currentCash = assets ? parseFloat(assets.currentCash || "0") : 0;
  const personalInvestments = assets ? parseFloat(assets.personalInvestments || "0") : 0;
  const homeValue = assets ? parseFloat(assets.homeValue || "0") : 0;
  const carValue = assets ? parseFloat(assets.carValue || "0") : 0;
  const current401k = assets ? parseFloat(assets.current401k || "0") : 0;
  const currentRothIRA = assets ? parseFloat(assets.currentRothIRA || "0") : 0;
  const otherAssets = assets ? parseFloat(assets.otherAssets || "0") : 0;
  
  const currentNetWorth = currentCash + personalInvestments + homeValue + carValue + current401k + currentRothIRA + otherAssets;
  const targetAge = retirementData?.plan?.targetRetirementAge || 65;
  const expectedReturn = parseFloat(retirementData?.plan?.expectedReturn || "7") / 100;

  const promotionPercentage = parseFloat(retirementData?.plan?.promotionPercentage || "3");
  const companyMatchPercent = income ? parseFloat(income.companyMatch || "0") : 0;
  
  // Calculate other investments (everything except 401k and Roth IRA)
  const otherInvestments = currentCash + personalInvestments + homeValue + carValue + otherAssets;
  
  const retirementCalc = calculateRetirement(
    currentAge,
    targetAge,
    grossAnnual,
    current401k,
    currentRothIRA,
    otherInvestments,
    contribution401kPercent,
    companyMatchPercent,
    promotionPercentage,
    monthlySavings,
    expectedReturn
  );

  const yearsToRetirement = targetAge - currentAge;
  const progressPercentage = yearsToRetirement > 0 ? ((40 - yearsToRetirement) / 40) * 100 : 0;

  if (isLoading) {
    return (
      <Card className="shadow-sm border animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Umbrella className="h-5 w-5" />
            <span>Retirement Estimator</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border animate-slide-up">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Umbrella className="h-5 w-5 text-primary" />
              <span>Retirement Estimator</span>
            </CardTitle>
            <CardDescription>
              Based on current savings rate and projections
            </CardDescription>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Adjust Plan
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Retirement Plan Settings</DialogTitle>
                <DialogDescription>
                  Customize your retirement planning assumptions.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentAge">Current Age</Label>
                  <Input
                    id="currentAge"
                    type="number"
                    min="18"
                    max="80"
                    {...register("currentAge", { valueAsNumber: true })}
                  />
                  {errors.currentAge && (
                    <p className="text-sm text-destructive">{errors.currentAge.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetRetirementAge">Target Retirement Age</Label>
                  <Input
                    id="targetRetirementAge"
                    type="number"
                    min="50"
                    max="80"
                    {...register("targetRetirementAge", { valueAsNumber: true })}
                  />
                  {errors.targetRetirementAge && (
                    <p className="text-sm text-destructive">{errors.targetRetirementAge.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expectedReturn">Expected Annual Return (%)</Label>
                  <Input
                    id="expectedReturn"
                    type="number"
                    step="0.1"
                    min="1"
                    max="15"
                    {...register("expectedReturn")}
                  />
                  {errors.expectedReturn && (
                    <p className="text-sm text-destructive">{errors.expectedReturn.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="inflationRate">Inflation Rate (%)</Label>
                  <Input
                    id="inflationRate"
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    {...register("inflationRate")}
                  />
                  {errors.inflationRate && (
                    <p className="text-sm text-destructive">{errors.inflationRate.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="withdrawalRate">Withdrawal Rate (%)</Label>
                  <Input
                    id="withdrawalRate"
                    type="number"
                    step="0.1"
                    min="2"
                    max="8"
                    {...register("withdrawalRate")}
                  />
                  {errors.withdrawalRate && (
                    <p className="text-sm text-destructive">{errors.withdrawalRate.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="promotionPercentage">Annual Pay Increase (%)</Label>
                  <Input
                    id="promotionPercentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    {...register("promotionPercentage")}
                  />
                  {errors.promotionPercentage && (
                    <p className="text-sm text-destructive">{errors.promotionPercentage.message}</p>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="submit"
                    disabled={updateRetirementPlanMutation.isPending}
                    className="flex-1"
                  >
                    {updateRetirementPlanMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Plan"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border">
            <div className="text-2xl font-bold text-primary">
              {targetAge}
            </div>
            <div className="text-sm text-muted-foreground">Retirement Age</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-chart-1/5 to-chart-1/10 rounded-lg border">
            <div className="text-2xl font-bold text-chart-1">
              {formatCurrency(retirementCalc.projectedSavings)}
            </div>
            <div className="text-sm text-muted-foreground">Projected Savings</div>
          </div>
        </div>
        
        {/* Progress to Retirement */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress to Retirement</span>
            <span className="text-card-foreground font-medium">
              {Math.max(0, progressPercentage).toFixed(0)}% complete
            </span>
          </div>
          
          <Progress 
            value={Math.max(0, Math.min(100, progressPercentage))}
            className="h-3"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Age {currentAge}</span>
            <span>Age {targetAge}</span>
          </div>
        </div>
        
        {/* Monthly Income in Retirement */}
        <div className="p-4 bg-gradient-to-r from-chart-2/5 to-chart-3/5 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Income in Retirement</p>
              <p className="text-xl font-bold text-card-foreground">
                {formatCurrency(retirementCalc.monthlyIncome)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-chart-2" />
          </div>
        </div>
        
        {/* Current Metrics */}
        <div className="space-y-3">
          <h4 className="font-medium text-card-foreground">Current Status</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Savings</span>
              <span className="font-medium text-card-foreground">
                {formatCurrency(monthlySavings)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Net Worth</span>
              <span className="font-medium text-card-foreground">
                {formatCurrency(currentNetWorth)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Years to Retirement</span>
              <span className="font-medium text-card-foreground">
                {yearsToRetirement} years
              </span>
            </div>
          </div>
        </div>

        {/* Calculation Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-card-foreground">Mathematical Calculation</h4>
          
          <div className="space-y-1 text-xs font-mono bg-muted/50 p-3 rounded-lg max-h-64 overflow-y-auto">
            {retirementCalc.calculationSteps.map((step, index) => (
              <div key={index} className={step === '' ? 'h-2' : 'text-muted-foreground'}>
                {step}
              </div>
            ))}
          </div>
        </div>
        
        {/* Assumptions */}
        <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-4">
          <p>• Expected return: {retirementData?.plan?.expectedReturn || "7.0"}% annually</p>
          <p>• Inflation rate: {retirementData?.plan?.inflationRate || "3.0"}% annually</p>
          <p>• Withdrawal rate: {retirementData?.plan?.withdrawalRate || "4.0"}% in retirement</p>
          <p>• Current savings rate maintained</p>
        </div>
      </CardContent>
    </Card>
  );
}
