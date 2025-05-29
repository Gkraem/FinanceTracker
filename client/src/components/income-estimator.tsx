import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIncomeDataSchema, type IncomeData, type InsertIncomeData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Loader2, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency, calculateTax } from "@/lib/utils";

const US_STATES = [
  "California",
  "Texas", 
  "New York",
  "Florida",
  "Illinois",
  "Pennsylvania",
  "Ohio",
  "Georgia",
  "North Carolina",
  "Michigan",
  "Maryland",
  "Washington",
  "Virginia",
  "Arizona",
  "Massachusetts",
  "Colorado",
  "Minnesota",
  "Wisconsin",
  "Tennessee",
  "Missouri"
];

interface IncomeResponse {
  income: IncomeData | null;
}

interface TaxCalculation {
  grossAnnual: number;
  federal: number;
  state: number;
  fica: number;
  contribution401k: number;
  netAnnual: number;
  netMonthly: number;
}

export default function IncomeEstimator() {
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: incomeData, isLoading } = useQuery<IncomeResponse>({
    queryKey: ["/api/income"],
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<Omit<InsertIncomeData, "userId">>({
    resolver: zodResolver(insertIncomeDataSchema.omit({ userId: true })),
    defaultValues: {
      annualSalary: "0",
      contribution401k: "0",
      companyMatch: "0",
      rothIRA: "0",
      dependents: 0,
      state: "",
      sideHustleIncome: "0",
      inheritance: "0",
    },
  });

  const updateIncomeMutation = useMutation({
    mutationFn: async (data: Omit<InsertIncomeData, "userId">) => {
      const response = await apiRequest("POST", "/api/income", data);
      return response.json() as Promise<IncomeResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Income updated",
        description: "Your income information has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update income data.",
        variant: "destructive",
      });
    },
  });

  // Load existing data when component mounts
  useEffect(() => {
    if (incomeData?.income) {
      const income = incomeData.income;
      reset({
        annualSalary: income.annualSalary,
        contribution401k: income.contribution401k,
        companyMatch: income.companyMatch,
        rothIRA: income.rothIRA,
        dependents: income.dependents,
        state: income.state,
        sideHustleIncome: income.sideHustleIncome || "0",
        inheritance: income.inheritance || "0",
      });
    }
  }, [incomeData, reset]);

  // Watch form values for real-time calculations
  const watchedValues = watch();

  useEffect(() => {
    const calculateTaxes = () => {
      const salary = parseFloat(watchedValues.annualSalary || "0");
      const contribution401kPercent = parseFloat(watchedValues.contribution401k || "0");
      const sideHustle = parseFloat(watchedValues.sideHustleIncome || "0");
      const inheritance = parseFloat(watchedValues.inheritance || "0");
      const state = watchedValues.state || "California";

      if (salary <= 0) {
        setTaxCalculation(null);
        return;
      }

      const grossAnnual = salary + sideHustle;
      const contribution401k = (salary * contribution401kPercent) / 100;
      const taxableIncome = grossAnnual - contribution401k;
      
      const taxes = calculateTax(taxableIncome, state);
      const netAnnual = taxableIncome - taxes.federal - taxes.state - taxes.fica;
      
      setTaxCalculation({
        grossAnnual,
        federal: taxes.federal,
        state: taxes.state,
        fica: taxes.fica,
        contribution401k,
        netAnnual,
        netMonthly: netAnnual / 12,
      });
    };

    calculateTaxes();
  }, [watchedValues]);

  const onSubmit = (data: Omit<InsertIncomeData, "userId">) => {
    updateIncomeMutation.mutate(data);
  };

  const savingsRate = taxCalculation 
    ? ((taxCalculation.contribution401k + parseFloat(watchedValues.rothIRA || "0")) / taxCalculation.grossAnnual) * 100
    : 0;

  return (
    <Card className="shadow-sm border animate-slide-up">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-primary" />
          <span>Income & Tax Estimator</span>
        </CardTitle>
        <CardDescription>
          Configure your income sources and see real-time tax calculations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income Inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="annualSalary">Annual Salary</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="annualSalary"
                    type="number"
                    step="1000"
                    placeholder="85000"
                    className="pl-8"
                    {...register("annualSalary")}
                  />
                </div>
                {errors.annualSalary && (
                  <p className="text-sm text-destructive">{errors.annualSalary.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contribution401k">401k Contribution (%)</Label>
                <Input
                  id="contribution401k"
                  type="number"
                  step="0.1"
                  max="100"
                  placeholder="15"
                  {...register("contribution401k")}
                />
                {errors.contribution401k && (
                  <p className="text-sm text-destructive">{errors.contribution401k.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyMatch">Company Match (%)</Label>
                <Input
                  id="companyMatch"
                  type="number"
                  step="0.1"
                  max="100"
                  placeholder="6"
                  {...register("companyMatch")}
                />
                {errors.companyMatch && (
                  <p className="text-sm text-destructive">{errors.companyMatch.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rothIRA">Roth IRA Contribution</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="rothIRA"
                    type="number"
                    step="100"
                    placeholder="6000"
                    className="pl-8"
                    {...register("rothIRA")}
                  />
                </div>
                {errors.rothIRA && (
                  <p className="text-sm text-destructive">{errors.rothIRA.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sideHustleIncome">Side Hustle Income</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="sideHustleIncome"
                    type="number"
                    step="100"
                    placeholder="0"
                    className="pl-8"
                    {...register("sideHustleIncome")}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dependents">Dependents</Label>
                <Select
                  onValueChange={(value) => setValue("dependents", parseInt(value))}
                  value={watchedValues.dependents?.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select number of dependents" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num === 5 ? "5+" : num.toString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  onValueChange={(value) => setValue("state", value)}
                  value={watchedValues.state}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state.message}</p>
                )}
              </div>
            </div>
            
            {/* Live Summary Card */}
            <div className="bg-gradient-to-br from-primary/5 to-chart-2/5 rounded-lg p-6 border">
              <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                Live Tax Summary
              </h3>
              
              {taxCalculation ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Gross Annual</span>
                    <span className="font-semibold text-card-foreground">
                      {formatCurrency(taxCalculation.grossAnnual)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">401k Contribution</span>
                    <span className="font-semibold text-primary">
                      -{formatCurrency(taxCalculation.contribution401k)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Federal Tax</span>
                    <span className="font-semibold text-destructive">
                      -{formatCurrency(taxCalculation.federal)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">State Tax</span>
                    <span className="font-semibold text-destructive">
                      -{formatCurrency(taxCalculation.state)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">FICA</span>
                    <span className="font-semibold text-destructive">
                      -{formatCurrency(taxCalculation.fica)}
                    </span>
                  </div>
                  
                  <hr className="border-border" />
                  
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-card-foreground">Net Monthly</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(taxCalculation.netMonthly)}
                    </span>
                  </div>
                  
                  <div className="mt-4 p-3 bg-card rounded-lg border">
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 text-chart-4 mr-2" />
                      <span className="text-muted-foreground">
                        You're saving{" "}
                        <strong className="text-primary">
                          {savingsRate.toFixed(1)}%
                        </strong>{" "}
                        of your gross income!
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Enter your annual salary to see tax calculations
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              disabled={updateIncomeMutation.isPending || !taxCalculation}
              className="bg-primary hover:bg-primary/90"
            >
              {updateIncomeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Calculations"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
