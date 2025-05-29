import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incomeData = pgTable("income_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  annualSalary: decimal("annual_salary", { precision: 12, scale: 2 }).notNull(),
  contribution401k: decimal("contribution_401k", { precision: 5, scale: 2 }).notNull(),
  companyMatch: decimal("company_match", { precision: 5, scale: 2 }).notNull(),
  rothIRA: decimal("roth_ira", { precision: 12, scale: 2 }).notNull(),
  dependents: integer("dependents").notNull().default(0),
  state: text("state").notNull(),
  sideHustleIncome: decimal("side_hustle_income", { precision: 12, scale: 2 }).default("0"),
  inheritance: decimal("inheritance", { precision: 12, scale: 2 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: text("frequency").notNull(), // monthly, weekly, bi-weekly, one-time
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetGoals = pgTable("budget_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  monthlyLimit: decimal("monthly_limit", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const retirementPlans = pgTable("retirement_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  targetRetirementAge: integer("target_retirement_age").notNull(),
  expectedReturn: decimal("expected_return", { precision: 5, scale: 2 }).notNull().default("7.0"),
  inflationRate: decimal("inflation_rate", { precision: 5, scale: 2 }).notNull().default("3.0"),
  withdrawalRate: decimal("withdrawal_rate", { precision: 5, scale: 2 }).notNull().default("4.0"),
  targetNetWorth: decimal("target_net_worth", { precision: 15, scale: 2 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  incomeData: one(incomeData),
  expenses: many(expenses),
  budgetGoals: many(budgetGoals),
  retirementPlan: one(retirementPlans),
}));

export const incomeDataRelations = relations(incomeData, ({ one }) => ({
  user: one(users, {
    fields: [incomeData.userId],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const budgetGoalsRelations = relations(budgetGoals, ({ one }) => ({
  user: one(users, {
    fields: [budgetGoals.userId],
    references: [users.id],
  }),
}));

export const retirementPlansRelations = relations(retirementPlans, ({ one }) => ({
  user: one(users, {
    fields: [retirementPlans.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertIncomeDataSchema = createInsertSchema(incomeData).omit({
  id: true,
  updatedAt: true,
}).extend({
  annualSalary: z.string().min(1, "Annual salary is required").refine(val => !isNaN(Number(val)) && Number(val) >= 0, "Must be a valid positive number"),
  contribution401k: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, "Must be between 0 and 100"),
  companyMatch: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, "Must be between 0 and 100"),
  rothIRA: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, "Must be a valid positive number"),
  sideHustleIncome: z.string().optional().refine(val => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Must be a valid positive number"),
  inheritance: z.string().optional().refine(val => !val || (!isNaN(Number(val)) && Number(val) >= 0), "Must be a valid positive number"),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertBudgetGoalSchema = createInsertSchema(budgetGoals).omit({
  id: true,
  createdAt: true,
});

export const insertRetirementPlanSchema = createInsertSchema(retirementPlans).omit({
  id: true,
  updatedAt: true,
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type IncomeData = typeof incomeData.$inferSelect;
export type InsertIncomeData = z.infer<typeof insertIncomeDataSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type BudgetGoal = typeof budgetGoals.$inferSelect;
export type InsertBudgetGoal = z.infer<typeof insertBudgetGoalSchema>;
export type RetirementPlan = typeof retirementPlans.$inferSelect;
export type InsertRetirementPlan = z.infer<typeof insertRetirementPlanSchema>;

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
