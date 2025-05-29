import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  loginSchema, 
  registerSchema, 
  insertIncomeDataSchema,
  insertExpenseSchema,
  insertBudgetGoalSchema,
  insertRetirementPlanSchema
} from "@shared/schema";
import bcrypt from "bcryptjs";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || "finance-tracker-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = await storage.createUser({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
      });

      // Set session
      req.session.userId = user.id;

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Registration failed" 
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      req.session.userId = user.id;

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Login failed" 
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "Failed to get user information" });
    }
  });

  // User profile routes
  app.put("/api/user/profile", requireAuth, async (req, res) => {
    try {
      const { firstName, lastName, email, phone } = req.body;
      
      const updatedUser = await storage.updateUser(req.session.userId!, {
        firstName,
        lastName,
        email,
        phone,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Income routes
  app.get("/api/income", requireAuth, async (req, res) => {
    try {
      const income = await storage.getIncomeData(req.session.userId!);
      res.json({ income });
    } catch (error) {
      console.error("Get income error:", error);
      res.status(500).json({ message: "Failed to get income data" });
    }
  });

  app.post("/api/income", requireAuth, async (req, res) => {
    try {
      const validatedData = insertIncomeDataSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });

      // Convert string values to numbers for database storage
      const incomeData = {
        ...validatedData,
        annualSalary: validatedData.annualSalary,
        contribution401k: validatedData.contribution401k,
        companyMatch: validatedData.companyMatch,
        rothIRA: validatedData.rothIRA,
        sideHustleIncome: validatedData.sideHustleIncome || "0",
        inheritance: validatedData.inheritance || "0",
      };

      const income = await storage.upsertIncomeData(incomeData);
      res.json({ income });
    } catch (error) {
      console.error("Update income error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to update income data" 
      });
    }
  });

  // Expense routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expenses = await storage.getExpenses(req.session.userId!);
      res.json({ expenses });
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ message: "Failed to get expenses" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });

      const expense = await storage.createExpense(expenseData);
      res.json({ expense });
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create expense" 
      });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const expenseData = insertExpenseSchema.partial().parse(req.body);

      const expense = await storage.updateExpense(expenseId, expenseData);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json({ expense });
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to update expense" 
      });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const success = await storage.deleteExpense(expenseId, req.session.userId!);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Budget goals routes
  app.get("/api/budget-goals", requireAuth, async (req, res) => {
    try {
      const goals = await storage.getBudgetGoals(req.session.userId!);
      res.json({ goals });
    } catch (error) {
      console.error("Get budget goals error:", error);
      res.status(500).json({ message: "Failed to get budget goals" });
    }
  });

  app.post("/api/budget-goals", requireAuth, async (req, res) => {
    try {
      const goalData = insertBudgetGoalSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });

      const goal = await storage.createBudgetGoal(goalData);
      res.json({ goal });
    } catch (error) {
      console.error("Create budget goal error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create budget goal" 
      });
    }
  });

  // Retirement planning routes
  app.get("/api/retirement", requireAuth, async (req, res) => {
    try {
      const plan = await storage.getRetirementPlan(req.session.userId!);
      res.json({ plan });
    } catch (error) {
      console.error("Get retirement plan error:", error);
      res.status(500).json({ message: "Failed to get retirement plan" });
    }
  });

  app.post("/api/retirement", requireAuth, async (req, res) => {
    try {
      const validatedData = insertRetirementPlanSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });

      // Convert string values and handle empty targetNetWorth
      const planData = {
        ...validatedData,
        expectedReturn: validatedData.expectedReturn,
        inflationRate: validatedData.inflationRate,
        withdrawalRate: validatedData.withdrawalRate,
        targetNetWorth: validatedData.targetNetWorth || undefined,
      };

      const plan = await storage.upsertRetirementPlan(planData);
      res.json({ plan });
    } catch (error) {
      console.error("Update retirement plan error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to update retirement plan" 
      });
    }
  });

  // Asset routes
  app.get("/api/assets", requireAuth, async (req, res) => {
    try {
      const assets = await storage.getAssets(req.session.userId!);
      res.json({ assets });
    } catch (error) {
      console.error("Get assets error:", error);
      res.status(500).json({ message: "Failed to get assets" });
    }
  });

  app.post("/api/assets", requireAuth, async (req, res) => {
    try {
      const validatedData = {
        ...req.body,
        userId: req.session.userId!,
      };

      const assets = await storage.upsertAssets(validatedData);
      res.json({ assets });
    } catch (error) {
      console.error("Update assets error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to update assets" 
      });
    }
  });

  // Admin routes
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    try {
      // Check if user is admin (phone number 2402857119)
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.phone !== "2402857119") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // For now, just return basic stats (you can expand this)
      res.json({ 
        message: "Admin panel - functionality to be implemented",
        adminUser: currentUser.firstName + " " + currentUser.lastName
      });
    } catch (error) {
      console.error("Admin panel error:", error);
      res.status(500).json({ message: "Failed to access admin panel" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
