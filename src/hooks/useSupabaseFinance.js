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

async function fetchFinanceSnapshot() {
  const [transactionsResult, budgetsResult] = await Promise.all([
    supabase.from("transactions").select("id,type,description,amount,category,date").order("date", { ascending: false }),
    supabase.from("budgets").select("category,amount"),
  ]);

  return { transactionsResult, budgetsResult };
}

export function useSupabaseFinance(user) {
  const [financeState, setFinanceState] = useState({ budgets: {}, transactions: [] });
  const [isLoading, setIsLoading] = useState(Boolean(user));
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!user || !supabase) {
      setFinanceState({ budgets: {}, transactions: [] });
      setIsLoading(false);
      setIsSyncing(false);
      setLastSyncedAt("");
      return undefined;
    }

    async function loadFinance() {
      setIsLoading(true);
      setIsSyncing(true);
      setError("");

      const { transactionsResult, budgetsResult } = await fetchFinanceSnapshot();

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
        setLastSyncedAt(new Date().toISOString());
      }

      setIsLoading(false);
      setIsSyncing(false);
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

    setIsSyncing(true);

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

    setIsSyncing(false);

    if (insertError) {
      return { error: insertError };
    }

    setFinanceState((current) => ({
      ...current,
      transactions: [mapTransactions([data])[0], ...current.transactions],
    }));
    setLastSyncedAt(new Date().toISOString());

    return { error: null };
  };

  const updateTransaction = async (transactionId, transaction) => {
    if (!user || !supabase) {
      return { error: new Error("Supabase ยังไม่พร้อม") };
    }

    setIsSyncing(true);

    const payload = {
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
    };

    const { data, error: updateError } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", transactionId)
      .select("id,type,description,amount,category,date")
      .single();

    setIsSyncing(false);

    if (updateError) {
      return { error: updateError };
    }

    const mappedTransaction = mapTransactions([data])[0];

    setFinanceState((current) => ({
      ...current,
      transactions: current.transactions
        .map((item) => (item.id === transactionId ? mappedTransaction : item))
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    }));
    setLastSyncedAt(new Date().toISOString());

    return { error: null };
  };

  const deleteTransaction = async (transactionId) => {
    if (!user || !supabase) {
      return { error: new Error("Supabase ยังไม่พร้อม") };
    }

    setIsSyncing(true);
    const { error: deleteError } = await supabase.from("transactions").delete().eq("id", transactionId);
    setIsSyncing(false);

    if (deleteError) {
      return { error: deleteError };
    }

    setFinanceState((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== transactionId),
    }));
    setLastSyncedAt(new Date().toISOString());

    return { error: null };
  };

  const saveBudget = async (category, amount) => {
    if (!user || !supabase) {
      return { error: new Error("Supabase ยังไม่พร้อม") };
    }

    setIsSyncing(true);

    const payload = {
      user_id: user.id,
      category,
      amount,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from("budgets").upsert(payload, { onConflict: "user_id,category" });

    setIsSyncing(false);

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
    setLastSyncedAt(new Date().toISOString());

    return { error: null };
  };

  const replaceFinanceData = async (snapshot) => {
    if (!user || !supabase) {
      return { error: new Error("Supabase ยังไม่พร้อม") };
    }

    const nextTransactions = Array.isArray(snapshot.transactions) ? snapshot.transactions : [];
    const nextBudgets = snapshot.budgets && typeof snapshot.budgets === "object" ? snapshot.budgets : {};

    setIsSyncing(true);

    const deleteTransactionsResult = await supabase.from("transactions").delete().eq("user_id", user.id);
    const deleteBudgetsResult = await supabase.from("budgets").delete().eq("user_id", user.id);

    if (deleteTransactionsResult.error || deleteBudgetsResult.error) {
      setIsSyncing(false);
      return { error: deleteTransactionsResult.error ?? deleteBudgetsResult.error };
    }

    if (nextTransactions.length > 0) {
      const transactionPayload = nextTransactions.map((transaction) => ({
        user_id: user.id,
        type: transaction.type,
        description: transaction.description ?? "",
        amount: Number(transaction.amount),
        category: transaction.category,
        date: transaction.date,
      }));

      const { error: insertTransactionsError } = await supabase.from("transactions").insert(transactionPayload);
      if (insertTransactionsError) {
        setIsSyncing(false);
        return { error: insertTransactionsError };
      }
    }

    const budgetEntries = Object.entries(nextBudgets);
    if (budgetEntries.length > 0) {
      const budgetPayload = budgetEntries.map(([category, amount]) => ({
        user_id: user.id,
        category,
        amount: Number(amount),
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertBudgetsError } = await supabase.from("budgets").upsert(budgetPayload, { onConflict: "user_id,category" });
      if (upsertBudgetsError) {
        setIsSyncing(false);
        return { error: upsertBudgetsError };
      }
    }

    const { transactionsResult, budgetsResult } = await fetchFinanceSnapshot();
    setIsSyncing(false);

    if (transactionsResult.error || budgetsResult.error) {
      return { error: transactionsResult.error ?? budgetsResult.error };
    }

    setFinanceState({
      budgets: mapBudgets(budgetsResult.data ?? []),
      transactions: mapTransactions(transactionsResult.data ?? []),
    });
    setLastSyncedAt(new Date().toISOString());

    return { error: null };
  };

  return {
    financeState,
    isLoading,
    isSyncing,
    lastSyncedAt,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    saveBudget,
    replaceFinanceData,
  };
}
