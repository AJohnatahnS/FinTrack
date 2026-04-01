import { useEffect, useState } from "react";
import { sampleData } from "../data/financeData";
import { supabase } from "../lib/supabaseClient";

function mapTransactions(rows) {
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    description: row.description ?? "",
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
  }));
}

function mapBudgets(rows) {
  return rows.reduce((acc, row) => {
    acc[row.category] = Number(row.amount);
    return acc;
  }, {});
}

export function useSupabaseFinance(user) {
  const [financeState, setFinanceState] = useState({ budgets: {}, transactions: [] });
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!user || !supabase) {
      setFinanceState({ budgets: {}, transactions: [] });
      setIsLoading(false);
      return undefined;
    }

    async function loadFinance() {
      setIsLoading(true);
      setError("");

      const [transactionsResult, budgetsResult] = await Promise.all([
        supabase.from("transactions").select("id,type,description,amount,category,date").order("date", { ascending: false }),
        supabase.from("budgets").select("category,amount"),
      ]);

      if (!active) {
        return;
      }

      if (transactionsResult.error || budgetsResult.error) {
        setError(transactionsResult.error?.message ?? budgetsResult.error?.message ?? "โหลดข้อมูลจาก Supabase ไม่สำเร็จ");
        setFinanceState(structuredClone(sampleData));
      } else {
        setFinanceState({
          budgets: mapBudgets(budgetsResult.data ?? []),
          transactions: mapTransactions(transactionsResult.data ?? []),
        });
      }

      setIsLoading(false);
    }

    loadFinance();

    return () => {
      active = false;
    };
  }, [user]);

  const addTransaction = async (transaction) => {
    if (!user || !supabase) {
      return { error: new Error("Supabase ยังไม่พร้อม") };
    }

    const payload = {
      user_id: user.id,
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
    };

    const { data, error: insertError } = await supabase
      .from("transactions")
      .insert(payload)
      .select("id,type,description,amount,category,date")
      .single();

    if (insertError) {
      return { error: insertError };
    }

    setFinanceState((current) => ({
      ...current,
      transactions: [mapTransactions([data])[0], ...current.transactions],
    }));

    return { error: null };
  };

  const deleteTransaction = async (transactionId) => {
    if (!user || !supabase) {
      return { error: new Error("Supabase ยังไม่พร้อม") };
    }

    const { error: deleteError } = await supabase.from("transactions").delete().eq("id", transactionId);

    if (deleteError) {
      return { error: deleteError };
    }

    setFinanceState((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== transactionId),
    }));

    return { error: null };
  };

  const saveBudget = async (category, amount) => {
    if (!user || !supabase) {
      return { error: new Error("Supabase ยังไม่พร้อม") };
    }

    const payload = {
      user_id: user.id,
      category,
      amount,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from("budgets").upsert(payload, { onConflict: "user_id,category" });

    if (upsertError) {
      return { error: upsertError };
    }

    setFinanceState((current) => ({
      ...current,
      budgets: {
        ...current.budgets,
        [category]: amount,
      },
    }));

    return { error: null };
  };

  return {
    financeState,
    isLoading,
    error,
    addTransaction,
    deleteTransaction,
    saveBudget,
  };
}
