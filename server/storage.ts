import { 
  users, 
  incomeData, 
  expenses, 
  budgetGoals, 
  retirementPlans,
  assets,
  type User, 
  type InsertUser,
  type IncomeData,
  type InsertIncomeData,
  type Expense,
  type InsertExpense,
  type BudgetGoal,
  type InsertBudgetGoal,
  type RetirementPlan,
  type InsertRetirementPlan,
  type Assets,
  type InsertAssets
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Income methods
  getIncomeData(userId: number): Promise<IncomeData | undefined>;
  upsertIncomeData(data: InsertIncomeData): Promise<IncomeData>;

  // Expense methods
  getExpenses(userId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number, userId: number): Promise<boolean>;

  // Budget methods
  getBudgetGoals(userId: number): Promise<BudgetGoal[]>;
  createBudgetGoal(goal: InsertBudgetGoal): Promise<BudgetGoal>;
  updateBudgetGoal(id: number, goal: Partial<InsertBudgetGoal>): Promise<BudgetGoal | undefined>;
  deleteBudgetGoal(id: number, userId: number): Promise<boolean>;

  // Retirement methods
  getRetirementPlan(userId: number): Promise<RetirementPlan | undefined>;
  upsertRetirementPlan(plan: InsertRetirementPlan): Promise<RetirementPlan>;

  // Asset methods
  getAssets(userId: number): Promise<Assets | undefined>;
  upsertAssets(assets: InsertAssets): Promise<Assets>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getIncomeData(userId: number): Promise<IncomeData | undefined> {
    const [income] = await db
      .select()
      .from(incomeData)
      .where(eq(incomeData.userId, userId));
    return income || undefined;
  }

  async upsertIncomeData(data: InsertIncomeData): Promise<IncomeData> {
    const existing = await this.getIncomeData(data.userId);
    
    if (existing) {
      const [updated] = await db
        .update(incomeData)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(incomeData.userId, data.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(incomeData)
        .values(data)
        .returning();
      return created;
    }
  }

  async getExpenses(userId: number): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.isActive, true)))
      .orderBy(expenses.createdAt);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db
      .insert(expenses)
      .values(expense)
      .returning();
    return created;
  }

  async updateExpense(id: number, expenseData: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db
      .update(expenses)
      .set(expenseData)
      .where(eq(expenses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExpense(id: number, userId: number): Promise<boolean> {
    const result = await db
      .update(expenses)
      .set({ isActive: false })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
    return result.rowCount > 0;
  }

  async getBudgetGoals(userId: number): Promise<BudgetGoal[]> {
    return await db
      .select()
      .from(budgetGoals)
      .where(and(eq(budgetGoals.userId, userId), eq(budgetGoals.isActive, true)))
      .orderBy(budgetGoals.createdAt);
  }

  async createBudgetGoal(goal: InsertBudgetGoal): Promise<BudgetGoal> {
    const [created] = await db
      .insert(budgetGoals)
      .values(goal)
      .returning();
    return created;
  }

  async updateBudgetGoal(id: number, goalData: Partial<InsertBudgetGoal>): Promise<BudgetGoal | undefined> {
    const [updated] = await db
      .update(budgetGoals)
      .set(goalData)
      .where(eq(budgetGoals.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBudgetGoal(id: number, userId: number): Promise<boolean> {
    const result = await db
      .update(budgetGoals)
      .set({ isActive: false })
      .where(and(eq(budgetGoals.id, id), eq(budgetGoals.userId, userId)));
    return result.rowCount > 0;
  }

  async getRetirementPlan(userId: number): Promise<RetirementPlan | undefined> {
    const [plan] = await db
      .select()
      .from(retirementPlans)
      .where(eq(retirementPlans.userId, userId));
    return plan || undefined;
  }

  async upsertRetirementPlan(plan: InsertRetirementPlan): Promise<RetirementPlan> {
    const existing = await this.getRetirementPlan(plan.userId);
    
    if (existing) {
      const [updated] = await db
        .update(retirementPlans)
        .set({ ...plan, updatedAt: new Date() })
        .where(eq(retirementPlans.userId, plan.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(retirementPlans)
        .values(plan)
        .returning();
      return created;
    }
  }

  async getAssets(userId: number): Promise<Assets | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.userId, userId));
    return asset || undefined;
  }

  async upsertAssets(assetData: InsertAssets): Promise<Assets> {
    const existing = await this.getAssets(assetData.userId);
    
    if (existing) {
      const [updated] = await db
        .update(assets)
        .set({ ...assetData, updatedAt: new Date() })
        .where(eq(assets.userId, assetData.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(assets)
        .values(assetData)
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
