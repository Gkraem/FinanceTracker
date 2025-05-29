import Navigation from "@/components/navigation";
import QuickStats from "@/components/quick-stats";
import ExpenseManager from "@/components/expense-manager";
import IncomeEstimator from "@/components/income-estimator";
import BudgetAnalysis from "@/components/budget-analysis";
import ForecastChart from "@/components/forecast-chart";
import RetirementEstimator from "@/components/retirement-estimator";
import AssetTracker from "@/components/asset-tracker";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user.firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's your financial overview for today.
          </p>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Stats Cards */}
            <QuickStats />

            {/* Expense Manager */}
            <ExpenseManager />

            {/* Asset Tracker */}
            <AssetTracker />

            {/* Income & Tax Estimator */}
            <IncomeEstimator />

            {/* Financial Forecasts Chart */}
            <ForecastChart />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Budget Analysis */}
            <BudgetAnalysis />

            {/* Retirement Estimator */}
            <RetirementEstimator />

            {/* Quick Actions */}
            <div className="bg-card rounded-xl shadow-sm border animate-slide-up">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-card-foreground">Quick Actions</h3>
              </div>
              
              <div className="p-6 space-y-3">
                <button className="w-full flex items-center justify-between p-3 text-left border border-border rounded-lg hover:bg-accent transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-chart-2/10 rounded-lg p-2">
                      <svg className="h-4 w-4 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-card-foreground font-medium">Export Report</span>
                  </div>
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 text-left border border-border rounded-lg hover:bg-accent transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="text-card-foreground font-medium">Connect Bank</span>
                  </div>
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 text-left border border-border rounded-lg hover:bg-accent transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-chart-3/10 rounded-lg p-2">
                      <svg className="h-4 w-4 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5c-5.523 0-10-4.477-10-10a9.953 9.953 0 010-2m0 0C5.953 13.477 6.477 13 7 13h3m12 0a9.953 9.953 0 01-2 0m-2 0H8m0 0V3" />
                      </svg>
                    </div>
                    <span className="text-card-foreground font-medium">Set Reminders</span>
                  </div>
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
