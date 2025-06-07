import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Users, Database, Settings, TrendingUp, Activity } from "lucide-react";
import { Link } from "wouter";

interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
}

interface AdminData {
  users: AdminUser[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    usersWithExpenses: number;
    totalExpenses: number;
  };
  adminUser: string;
}

export default function Admin() {
  const { user, isAdmin } = useAuth();

  const { data: adminData, isLoading, error } = useQuery<AdminData>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Access denied. Administrator privileges required.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/">
              <Button>Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="bg-primary rounded-lg p-2">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            </div>
            <Link href="/">
              <Button variant="outline" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Back to Finance Tracker</span>
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">
            System administration and user management
          </p>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : (adminData?.stats.totalUsers || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered accounts
              </p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : (adminData?.stats.activeUsers || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Users with income data
              </p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users with Expenses</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : (adminData?.stats.usersWithExpenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Users tracking expenses
              </p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : (adminData?.stats.totalExpenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tracked expense entries
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Admin Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Management */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>User Management</span>
              </CardTitle>
              <CardDescription>
                Manage user accounts and view user information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-2">System Statistics</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total registered users</span>
                    <span className="font-medium">
                      {isLoading ? "..." : (adminData?.stats.totalUsers || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users with income setup</span>
                    <span className="font-medium">
                      {isLoading ? "..." : (adminData?.stats.activeUsers || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users tracking expenses</span>
                    <span className="font-medium">
                      {isLoading ? "..." : (adminData?.stats.usersWithExpenses || 0)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                <h4 className="font-medium text-sm">Recent Users</h4>
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading users...</div>
                ) : (
                  adminData?.users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 border border-border rounded text-sm">
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-muted-foreground text-xs">{user.email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>System Settings</span>
              </CardTitle>
              <CardDescription>
                Configure system parameters and features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-2">System Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Database</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      Online
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>API Services</span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      Healthy
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Backup Status</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      Complete
                    </span>
                  </div>
                </div>
              </div>
              
              <Button className="w-full" variant="outline">
                Configure Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Logs */}
        <Card className="mt-8 animate-slide-up">
          <CardHeader>
            <CardTitle>System Logs</CardTitle>
            <CardDescription>
              Recent system activity and events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 hover:bg-accent rounded">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>User john.doe@example.com logged in</span>
                </div>
                <span className="text-muted-foreground">2 minutes ago</span>
              </div>
              
              <div className="flex justify-between items-center p-2 hover:bg-accent rounded">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Database backup completed successfully</span>
                </div>
                <span className="text-muted-foreground">1 hour ago</span>
              </div>
              
              <div className="flex justify-between items-center p-2 hover:bg-accent rounded">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>High CPU usage detected (85%)</span>
                </div>
                <span className="text-muted-foreground">3 hours ago</span>
              </div>
              
              <div className="flex justify-between items-center p-2 hover:bg-accent rounded">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>New user registration: sarah.wilson@example.com</span>
                </div>
                <span className="text-muted-foreground">5 hours ago</span>
              </div>
            </div>
            
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                View Full Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Admin Info */}
        {adminData && (
          <Alert className="mt-8">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Admin Panel Access - Logged in as {adminData.adminUser}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
