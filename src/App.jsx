import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { BudgetList } from "./components/BudgetList";
import { ChartList } from "./components/ChartList";
import { EmptyState } from "./components/EmptyState";
import { SummaryCard } from "./components/SummaryCard";
import { TransactionList } from "./components/TransactionList";
import { categories } from "./data/financeData";
import { useSupabaseFinance } from "./hooks/useSupabaseFinance";
import { supabase, hasSupabaseConfig } from "./lib/supabaseClient";
import { formatCurrency, formatDisplayDate, getTodayValue } from "./utils/formatters";

const quickFillPresets = {
  expense: ["ค่าอาหาร", "ค่าน้ำมัน", "ค่าเดินทาง", "ค่ากาแฟ", "ค่าบิล", "ค่าของใช้"],
  income: ["เงินเดือน", "ค่าจ้าง", "โบนัส", "ฟรีแลนซ์", "ขายของ", "รายรับพิเศษ"],
};

const defaultTransactionForm = {
  type: "expense",
  description: "",
  amount: "",
  category: categories.expense[0],
  date: getTodayValue(),
};

export default function App() {
  const [transactionForm, setTransactionForm] = useState(defaultTransactionForm);
  const [budgetForm, setBudgetForm] = useState({ category: categories.expense[0], amount: "" });
  const [authMode, setAuthMode] = useState("signin");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [recoveryForm, setRecoveryForm] = useState({ password: "", confirmPassword: "" });
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryInfo, setRecoveryInfo] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  const user = session?.user ?? null;
  const { financeState, isLoading, error, addTransaction, deleteTransaction, saveBudget } = useSupabaseFinance(user);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setAuthReady(true);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session ?? null);
        setAuthReady(true);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);

      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryFlow(true);
        setRecoveryError("");
        setRecoveryInfo("");
      }

      if (event === "USER_UPDATED") {
        setIsRecoveryFlow(false);
      }

      if (event === "SIGNED_OUT") {
        setIsRecoveryFlow(false);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setTransactionForm((current) => {
      const nextCategory = categories[current.type][0];
      const nextDescription = quickFillPresets[current.type].includes(current.description)
        ? ""
        : current.description;

      if (current.category === nextCategory && current.description === nextDescription) {
        return current;
      }

      return {
        ...current,
        category: nextCategory,
        description: nextDescription,
      };
    });
  }, [transactionForm.type]);

  const deferredTransactions = useDeferredValue(financeState.transactions);

  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return deferredTransactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }, [deferredTransactions]);

  const summary = useMemo(() => {
    const income = sumAmounts(currentMonthTransactions.filter((item) => item.type === "income"));
    const expense = sumAmounts(currentMonthTransactions.filter((item) => item.type === "expense"));
    const net = income - expense;
    const budgetTotal = Object.values(financeState.budgets).reduce((sum, value) => sum + value, 0);
    const budgetUsedPercent = budgetTotal > 0 ? Math.min((expense / budgetTotal) * 100, 999) : 0;

    return { income, expense, net, budgetUsedPercent };
  }, [currentMonthTransactions, financeState.budgets]);

  const categorySpending = useMemo(() => {
    return currentMonthTransactions
      .filter((item) => item.type === "expense")
      .reduce((acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] ?? 0) + transaction.amount;
        return acc;
      }, {});
  }, [currentMonthTransactions]);

  const categoryEntries = useMemo(() => {
    return Object.entries(categorySpending).sort((a, b) => b[1] - a[1]);
  }, [categorySpending]);

  const budgetEntries = useMemo(() => {
    return Object.entries(financeState.budgets).sort((a, b) => a[0].localeCompare(b[0], "th"));
  }, [financeState.budgets]);

  const sortedTransactions = useMemo(() => {
    return [...financeState.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [financeState.transactions]);

  const switchAuthMode = (nextMode) => {
    setAuthMode(nextMode);
    setAuthError("");
    setAuthInfo("");
    setLoginForm((current) => ({ ...current, password: nextMode === "reset" ? "" : current.password }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    if (!loginForm.email.trim()) {
      setAuthError("กรอกอีเมลก่อน");
      return;
    }

    if (authMode !== "reset" && !loginForm.password) {
      setAuthError("กรอกรหัสผ่านให้ครบก่อน");
      return;
    }

    if (!supabase) {
      setAuthError("ยังไม่ได้ตั้งค่า Supabase");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError("");
    setAuthInfo("");

    if (authMode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      if (signInError) {
        setAuthError(signInError.message);
      } else {
        setLoginForm({ email: "", password: "" });
      }
    } else if (authMode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      if (signUpError) {
        setAuthError(signUpError.message);
      } else {
        setAuthInfo("สมัครสมาชิกสำเร็จแล้ว ถ้าเปิด email confirmation ไว้ให้ยืนยันอีเมลก่อน login");
        setAuthMode("signin");
      }
    } else {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(loginForm.email.trim(), {
        redirectTo: window.location.origin,
      });

      if (resetError) {
        setAuthError(resetError.message);
      } else {
        setAuthInfo("ส่งอีเมลสำหรับรีเซ็ตรหัสผ่านแล้ว โปรดตรวจ inbox และ spam");
        setAuthMode("signin");
      }
    }

    setIsSubmittingAuth(false);
  };

  const handleRecoverySubmit = async (event) => {
    event.preventDefault();

    if (!recoveryForm.password || !recoveryForm.confirmPassword) {
      setRecoveryError("กรอกรหัสผ่านใหม่ให้ครบก่อน");
      return;
    }

    if (recoveryForm.password.length < 6) {
      setRecoveryError("รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (recoveryForm.password !== recoveryForm.confirmPassword) {
      setRecoveryError("รหัสผ่านใหม่กับการยืนยันไม่ตรงกัน");
      return;
    }

    if (!supabase) {
      setRecoveryError("ยังไม่ได้ตั้งค่า Supabase");
      return;
    }

    setIsSubmittingRecovery(true);
    setRecoveryError("");
    setRecoveryInfo("");

    const { error: updateError } = await supabase.auth.updateUser({
      password: recoveryForm.password,
    });

    if (updateError) {
      setRecoveryError(updateError.message);
    } else {
      setRecoveryInfo("ตั้งรหัสผ่านใหม่สำเร็จแล้ว กำลังพาเข้าสู่แอป");
      setRecoveryForm({ password: "", confirmPassword: "" });
      setIsRecoveryFlow(false);
    }

    setIsSubmittingRecovery(false);
  };

  const handleLogout = async () => {
    setActionError("");
    setIsEntryOpen(false);
    setIsRecoveryFlow(false);

    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const handleTransactionSubmit = async (event) => {
    event.preventDefault();
    setActionError("");

    const amount = Number(transactionForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setActionError("จำนวนเงินต้องมากกว่า 0");
      return;
    }

    const result = await addTransaction({
      type: transactionForm.type,
      description: transactionForm.description.trim(),
      amount,
      category: transactionForm.category,
      date: transactionForm.date,
    });

    if (result.error) {
      setActionError(result.error.message ?? "บันทึกรายการไม่สำเร็จ");
      return;
    }

    setTransactionForm({
      type: transactionForm.type,
      description: "",
      amount: "",
      category: categories[transactionForm.type][0],
      date: getTodayValue(),
    });
    setIsEntryOpen(false);
  };

  const handleBudgetSubmit = async (event) => {
    event.preventDefault();
    setActionError("");

    const amount = Number(budgetForm.amount);
    if (Number.isNaN(amount) || amount < 0) {
      setActionError("งบประมาณต้องเป็นตัวเลข 0 ขึ้นไป");
      return;
    }

    const result = await saveBudget(budgetForm.category, amount);
    if (result.error) {
      setActionError(result.error.message ?? "บันทึกงบประมาณไม่สำเร็จ");
      return;
    }

    setBudgetForm((current) => ({ ...current, amount: "" }));
  };

  const handleDeleteTransaction = async (transactionId) => {
    setActionError("");
    const result = await deleteTransaction(transactionId);

    if (result.error) {
      setActionError(result.error.message ?? "ลบรายการไม่สำเร็จ");
    }
  };

  const openEntryDrawer = () => {
    setActionError("");
    setTransactionForm((current) => ({
      ...current,
      date: current.date || getTodayValue(),
    }));
    setIsEntryOpen(true);
  };

  if (!hasSupabaseConfig) {
    return (
      <div className="lock-screen-shell">
        <section className="lock-card">
          <p className="eyebrow">Supabase Setup</p>
          <h1 className="lock-title">ยังไม่ได้ตั้งค่า Supabase</h1>
          <p className="lock-copy">เพิ่ม VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local ก่อนใช้งาน</p>
        </section>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="lock-screen-shell">
        <section className="lock-card">
          <p className="eyebrow">Secure Access</p>
          <h1 className="lock-title">กำลังเชื่อมต่อ Supabase</h1>
          <p className="lock-copy">โปรดรอสักครู่ก่อนเข้าใช้งาน Finance Flow</p>
        </section>
      </div>
    );
  }

  if (isRecoveryFlow && user) {
    return (
      <div className="lock-screen-shell">
        <section className="lock-card">
          <p className="eyebrow">Password Recovery</p>
          <h1 className="lock-title">ตั้งรหัสผ่านใหม่ก่อนเข้าหน้าหลัก</h1>
          <p className="lock-copy">คุณเข้ามาจาก recovery link ของ Supabase จึงต้องตั้งรหัสผ่านใหม่ให้เสร็จก่อน</p>
          <form className="lock-form" onSubmit={handleRecoverySubmit}>
            <label>
              <span>รหัสผ่านใหม่</span>
              <input
                className="pin-input"
                type="password"
                autoComplete="new-password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={recoveryForm.password}
                onChange={(event) => setRecoveryForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>ยืนยันรหัสผ่านใหม่</span>
              <input
                className="pin-input"
                type="password"
                autoComplete="new-password"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                value={recoveryForm.confirmPassword}
                onChange={(event) => setRecoveryForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
              />
            </label>
            {recoveryError ? <p className="pin-error">{recoveryError}</p> : null}
            {recoveryInfo ? <p className="auth-info">{recoveryInfo}</p> : null}
            <button className="primary-btn" type="submit" disabled={isSubmittingRecovery}>
              {isSubmittingRecovery ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="lock-screen-shell">
        <section className="lock-card">
          <p className="eyebrow">Secure Access</p>
          <h1 className="lock-title">เข้าสู่ระบบเพื่อซิงค์ข้อมูล</h1>
          <p className="lock-copy">เมื่อ login ด้วยบัญชีเดียวกันบนมือถือและคอม ข้อมูลจะถูกดึงจาก Supabase ชุดเดียวกัน</p>
          <div className="toggle-bar auth-toggle" role="tablist" aria-label="โหมดเข้าสู่ระบบ">
            <button className={authMode === "signin" ? "toggle-option active income" : "toggle-option"} type="button" onClick={() => switchAuthMode("signin")}>เข้าสู่ระบบ</button>
            <button className={authMode === "signup" ? "toggle-option active expense" : "toggle-option"} type="button" onClick={() => switchAuthMode("signup")}>สมัครสมาชิก</button>
          </div>
          <form className="lock-form" onSubmit={handleAuthSubmit}>
            <label>
              <span>อีเมล</span>
              <input type="email" autoComplete="email" placeholder="you@example.com" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} required />
            </label>
            {authMode !== "reset" ? (
              <label>
                <span>รหัสผ่าน</span>
                <input className="pin-input" type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} placeholder="อย่างน้อย 6 ตัวอักษร" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} required />
              </label>
            ) : null}
            {authError ? <p className="pin-error">{authError}</p> : null}
            {authInfo ? <p className="auth-info">{authInfo}</p> : null}
            <button className="primary-btn" type="submit" disabled={isSubmittingAuth}>
              {isSubmittingAuth ? "กำลังตรวจสอบ..." : authMode === "signin" ? "เข้าสู่ระบบ" : authMode === "signup" ? "สร้างบัญชี" : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
            </button>
            <div className="auth-link-row">
              {authMode === "signin" ? (
                <button className="auth-link-btn" type="button" onClick={() => switchAuthMode("reset")}>ลืมรหัสผ่าน?</button>
              ) : null}
              {authMode === "reset" ? (
                <button className="auth-link-btn" type="button" onClick={() => switchAuthMode("signin")}>กลับไปหน้าเข้าสู่ระบบ</button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Personal Finance Dashboard</p>
          <h1>คุมเงินของคุณแบบเห็นภาพจริง</h1>
          <p className="hero-copy">บันทึกรายรับรายจ่าย ติดตามงบประมาณ และซิงค์ข้อมูลข้ามอุปกรณ์ผ่าน Supabase</p>
        </div>
        <div className="hero-side">
          <div className="hero-stat">
            <span>เดือนนี้</span>
            <strong>{formatCurrency(summary.net)}</strong>
            <small>{user.email}</small>
          </div>
          <button className="logout-btn" type="button" onClick={handleLogout}>ออกจากระบบ</button>
        </div>
      </header>

      {error || actionError ? <div className="panel notice-panel error">{actionError || error}</div> : null}
      {isLoading ? <div className="panel notice-panel">กำลังโหลดข้อมูลจาก Supabase...</div> : null}

      <main className="layout compact-layout">
        <section className="summary-grid">
          <SummaryCard tone="income" label="รายรับเดือนนี้" value={formatCurrency(summary.income)} />
          <SummaryCard tone="expense" label="รายจ่ายเดือนนี้" value={formatCurrency(summary.expense)} />
          <SummaryCard tone="balance" label="คงเหลือเดือนนี้" value={formatCurrency(summary.net)} />
          <SummaryCard tone="budget" label="ใช้งบไปแล้ว" value={`${summary.budgetUsedPercent.toFixed(0)}%`} />
        </section>

        <section className="panel chart-panel">
          <div className="panel-head">
            <h2>ภาพรวมรายจ่ายตามหมวดหมู่</h2>
            <p>แสดงเฉพาะรายการของเดือนปัจจุบัน</p>
          </div>
          {categoryEntries.length === 0 ? <EmptyState /> : <ChartList entries={categoryEntries} />}
        </section>

        <section className="panel budget-panel">
          <div className="panel-head">
            <h2>งบประมาณรายเดือน</h2>
            <p>กำหนดเพดานค่าใช้จ่ายต่อหมวดหมู่</p>
          </div>

          <form className="split budget-form" onSubmit={handleBudgetSubmit}>
            <label>
              <span>หมวดหมู่</span>
              <select value={budgetForm.category} onChange={(event) => setBudgetForm((current) => ({ ...current, category: event.target.value }))}>
                {categories.expense.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              <span>งบประมาณ</span>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={budgetForm.amount} onChange={(event) => setBudgetForm((current) => ({ ...current, amount: event.target.value }))} required />
            </label>

            <button className="secondary-btn" type="submit">บันทึกงบ</button>
          </form>

          {budgetEntries.length === 0 ? <EmptyState /> : <BudgetList entries={budgetEntries} categorySpending={categorySpending} />}
        </section>

        <section className="panel transaction-panel full-span">
          <div className="panel-head">
            <h2>รายการล่าสุด</h2>
            <p>ลบรายการที่บันทึกผิดได้ทันที</p>
          </div>
          {sortedTransactions.length === 0 ? (
            <EmptyState />
          ) : (
            <TransactionList
              items={sortedTransactions.map((item) => ({
                ...item,
                amountLabel: `${item.type === "expense" ? "-" : "+"}${formatCurrency(item.amount)}`,
                typeLabel: item.type === "expense" ? "รายจ่าย" : "รายรับ",
                dateLabel: formatDisplayDate(item.date),
              }))}
              onRemove={handleDeleteTransaction}
            />
          )}
        </section>
      </main>

      <button className="fab-entry" type="button" onClick={openEntryDrawer} aria-label="เพิ่มรายการ">
        <span className="fab-plus">+</span>
        <span className="fab-label">เพิ่มรายการ</span>
      </button>

      {isEntryOpen ? (
        <div className="entry-overlay" onClick={() => setIsEntryOpen(false)}>
          <section className="entry-drawer panel" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <div className="panel-head entry-head">
              <div>
                <h2>เพิ่มรายการ</h2>
                <p>แตะเลือกประเภทรายการแล้วกรอกเฉพาะที่จำเป็น</p>
              </div>
              <button className="close-btn" type="button" onClick={() => setIsEntryOpen(false)}>ปิด</button>
            </div>

            <form className="stack" onSubmit={handleTransactionSubmit}>
              <label>
                <span>ประเภทรายการ</span>
                <div className="toggle-bar" role="tablist" aria-label="ประเภทรายการ">
                  <button className={transactionForm.type === "expense" ? "toggle-option active expense" : "toggle-option"} type="button" onClick={() => setTransactionForm((current) => ({ ...current, type: "expense" }))}>รายจ่าย</button>
                  <button className={transactionForm.type === "income" ? "toggle-option active income" : "toggle-option"} type="button" onClick={() => setTransactionForm((current) => ({ ...current, type: "income" }))}>รายรับ</button>
                </div>
              </label>

              <label>
                <span>รายละเอียด</span>
                <input type="text" placeholder={transactionForm.type === "expense" ? "เช่น ค่าอาหารเย็น" : "เช่น เงินเดือน"} value={transactionForm.description} onChange={(event) => setTransactionForm((current) => ({ ...current, description: event.target.value }))} />
              </label>

              <div className="quick-fill-row">
                {quickFillPresets[transactionForm.type].map((preset) => (
                  <button key={preset} className="quick-fill-chip" type="button" onClick={() => setTransactionForm((current) => ({ ...current, description: preset }))}>{preset}</button>
                ))}
              </div>

              <div className="split">
                <label>
                  <span>จำนวนเงิน</span>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={transactionForm.amount} onChange={(event) => setTransactionForm((current) => ({ ...current, amount: event.target.value }))} required />
                </label>

                <label>
                  <span>วันที่</span>
                  <input type="date" value={transactionForm.date} onChange={(event) => setTransactionForm((current) => ({ ...current, date: event.target.value }))} required />
                </label>
              </div>

              <label>
                <span>หมวดหมู่</span>
                <select value={transactionForm.category} onChange={(event) => setTransactionForm((current) => ({ ...current, category: event.target.value }))}>
                  {categories[transactionForm.type].map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <button className="primary-btn" type="submit">บันทึกรายการ</button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
