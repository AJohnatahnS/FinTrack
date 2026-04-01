import { getTodayValue } from "../utils/formatters";

export const storageKey = "finance-flow-data-v1";

export const categories = {
  expense: ["food", "travel", "housing", "bills", "shopping", "health", "entertainment", "other"],
  income: ["salary", "bonus", "freelance", "sales", "interest", "other"],
};

export const sampleData = {
  budgets: {
    food: 8000,
    travel: 4000,
    bills: 6000,
  },
  transactions: [
    {
      id: crypto.randomUUID(),
      type: "income",
      description: "Salary",
      amount: 42000,
      category: "salary",
      date: getTodayValue(),
    },
    {
      id: crypto.randomUUID(),
      type: "expense",
      description: "Fuel",
      amount: 1800,
      category: "travel",
      date: getTodayValue(),
    },
    {
      id: crypto.randomUUID(),
      type: "expense",
      description: "Supermarket",
      amount: 2350,
      category: "food",
      date: getTodayValue(),
    },
  ],
};
