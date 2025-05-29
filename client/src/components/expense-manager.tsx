import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExpenseSchema, type Expense, type InsertExpense } from "@shared/schema";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
  "Rent",
  "Insurance", 
  "Entertainment",
  "Groceries",
  "Transportation",
  "Dining Out",
  "Shopping",
  "Roth IRA",
  "Student Debt",
  "Healthcare",
  "Utilities",
  "Other"
];

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "yearly", label: "Yearly" },
  { value: "one-time", label: "One-time" },
];

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    "Rent": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    "Insurance": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    "Entertainment": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    "Groceries": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    "Transportation": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    "Dining Out": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    "Shopping": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    "Roth IRA": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    "Student Debt": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    "Healthcare": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    "Utilities": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    "Other": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };
  return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
};

interface ExpensesResponse {
  expenses: Expense[];
}

interface ExpenseResponse {
  expense: Expense;
}

export default function ExpenseManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expensesData, isLoading } = useQuery<ExpensesResponse>({
    queryKey: ["/api/expenses"],
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InsertExpense>({
    resolver: zodResolver(insertExpenseSchema.omit({ userId: true })),
    defaultValues: {
      category: "",
      description: "",
      amount: "",
      frequency: "monthly",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: Omit<InsertExpense, "userId">) => {
      const response = await apiRequest("POST", "/api/expenses", data);
      return response.json() as Promise<ExpenseResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      reset();
      setIsAddDialogOpen(false);
      toast({
        title: "Expense added",
        description: "Your expense has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense.",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      await apiRequest("DELETE", `/api/expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Expense deleted",
        description: "Your expense has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense.",
        variant: "destructive",
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Omit<InsertExpense, "userId"> }) => {
      await apiRequest("PUT", `/api/expenses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsEditDialogOpen(false);
      setEditingExpense(null);
      toast({
        title: "Expense updated",
        description: "Your expense has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Omit<InsertExpense, "userId">) => {
    createExpenseMutation.mutate(data);
  };

  const onEditSubmit = (data: Omit<InsertExpense, "userId">) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data });
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setValue("category", expense.category);
    setValue("description", expense.description);
    setValue("amount", expense.amount);
    setValue("frequency", expense.frequency);
    setIsEditDialogOpen(true);
  };

  const handleDeleteExpense = (expenseId: number) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(expenseId);
    }
  };

  const expenses = expensesData?.expenses || [];
  const filteredExpenses = categoryFilter === "all" 
    ? expenses 
    : expenses.filter(expense => expense.category === categoryFilter);

  return (
    <Card className="shadow-sm border animate-slide-up">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span>Expense Manager</span>
            </CardTitle>
            <CardDescription>
              Track and categorize your monthly expenses
            </CardDescription>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Add a new expense to track your spending.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    onValueChange={(value) => setValue("category", value)}
                    value={watch("category")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-destructive">{errors.category.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Enter expense description"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8"
                      {...register("amount")}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    onValueChange={(value) => setValue("frequency", value)}
                    value={watch("frequency")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.frequency && (
                    <p className="text-sm text-destructive">{errors.frequency.message}</p>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="submit"
                    disabled={createExpenseMutation.isPending}
                    className="flex-1"
                  >
                    {createExpenseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Expense"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Expense Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
                <DialogDescription>
                  Update your expense details below.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={watch("category")}
                      onValueChange={(value) => setValue("category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-frequency">Frequency</Label>
                    <Select
                      value={watch("frequency")}
                      onValueChange={(value) => setValue("frequency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    placeholder="e.g., Monthly rent payment"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount ($)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register("amount")}
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="flex space-x-4 pt-4">
                  <Button
                    type="submit"
                    disabled={updateExpenseMutation.isPending}
                    className="flex-1"
                  >
                    {updateExpenseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Expense"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
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
      
      <CardContent className="p-6">
        {/* Category Filter */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-muted-foreground mb-2 block">
            Filter by Category
          </Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Expenses Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex space-x-4 p-4">
                  <div className="rounded-full bg-muted h-4 w-4"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">No expenses found</h3>
              <p className="text-muted-foreground mb-4">
                {categoryFilter === "all" 
                  ? "Start by adding your first expense to track your spending."
                  : `No expenses found in the "${categoryFilter}" category.`
                }
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Expense
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Frequency</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-border/50 hover:bg-accent/50 transition-colors duration-200"
                  >
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className={getCategoryColor(expense.category)}>
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-card-foreground">{expense.description}</td>
                    <td className="py-3 px-4 text-right font-semibold text-card-foreground">
                      {formatCurrency(parseFloat(expense.amount))}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground capitalize">
                      {expense.frequency.replace("-", " ")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditExpense(expense)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                          disabled={deleteExpenseMutation.isPending}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
