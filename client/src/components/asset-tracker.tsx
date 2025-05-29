import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign, Home, Car, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Assets } from "@shared/schema";

interface AssetsResponse {
  assets: Assets | null;
}

export default function AssetTracker() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    currentCash: "",
    current401k: "",
    currentRothIRA: "",
    homeValue: "",
    carValue: "",
    personalInvestments: "",
    otherAssets: "",
  });

  const { data: assetsData, isLoading } = useQuery<AssetsResponse>({
    queryKey: ["/api/assets"],
    select: (data) => data,
  });

  const updateAssets = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/assets", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Assets Updated",
        description: "Your asset information has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assets",
        variant: "destructive",
      });
    },
  });

  // Update form data when assets data loads
  React.useEffect(() => {
    if (assetsData?.assets) {
      const assets = assetsData.assets;
      setFormData({
        currentCash: assets.currentCash || "0",
        current401k: assets.current401k || "0",
        currentRothIRA: assets.currentRothIRA || "0",
        homeValue: assets.homeValue || "0",
        carValue: assets.carValue || "0",
        personalInvestments: assets.personalInvestments || "0",
        otherAssets: assets.otherAssets || "0",
      });
    }
  }, [assetsData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAssets.mutate(formData);
  };

  const totalAssets = Object.values(formData).reduce((sum, val) => 
    sum + (parseFloat(val) || 0), 0
  );

  const netWorth = totalAssets;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Asset Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Asset Tracker
        </CardTitle>
        <CardDescription>
          Track your current financial position including cash, retirement accounts, and assets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Net Worth</span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(netWorth)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cash & Liquid Assets */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cash & Liquid Assets
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="currentCash">Current Cash (Checking/Savings)</Label>
                <Input
                  id="currentCash"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.currentCash}
                  onChange={(e) => handleInputChange("currentCash", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personalInvestments">Personal Investments</Label>
                <Input
                  id="personalInvestments"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.personalInvestments}
                  onChange={(e) => handleInputChange("personalInvestments", e.target.value)}
                />
              </div>
            </div>

            {/* Retirement Accounts */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <PiggyBank className="h-5 w-5" />
                Retirement Accounts
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="current401k">Current 401(k) Balance</Label>
                <Input
                  id="current401k"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.current401k}
                  onChange={(e) => handleInputChange("current401k", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentRothIRA">Current Roth IRA Balance</Label>
                <Input
                  id="currentRothIRA"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.currentRothIRA}
                  onChange={(e) => handleInputChange("currentRothIRA", e.target.value)}
                />
              </div>
            </div>

            {/* Physical Assets */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Home className="h-5 w-5" />
                Physical Assets
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="homeValue">Home Value</Label>
                <Input
                  id="homeValue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.homeValue}
                  onChange={(e) => handleInputChange("homeValue", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carValue">Vehicle Value</Label>
                <Input
                  id="carValue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.carValue}
                  onChange={(e) => handleInputChange("carValue", e.target.value)}
                />
              </div>
            </div>

            {/* Other Assets */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Other Assets
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="otherAssets">Other Assets (Collectibles, etc.)</Label>
                <Input
                  id="otherAssets"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.otherAssets}
                  onChange={(e) => handleInputChange("otherAssets", e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={updateAssets.isPending}
          >
            {updateAssets.isPending ? "Saving..." : "Save Assets"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}