import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { BudgetList } from "./components/BudgetList";
import { ChartList } from "./components/ChartList";
import { EmptyState } from "./components/EmptyState";
import { SummaryCard } from "./components/SummaryCard";
import { TransactionList } from "./components/TransactionList";
import { categories } from "./data/financeData";
import { useSupabaseFinance } from "./hooks/useSupabaseFinance";
import { languageOptions, translations, getCategoryLabel, getDescriptionSuggestions } from "./i18n";
import { supabase, hasSupabaseConfig } from "./lib/supabaseClient";
import { formatCurrency, formatDisplayDate, getTodayValue } from "./utils/formatters";

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const TRANSACTIONS_PER_PAGE = 5;

const defaultTransactionForm = {
  type: "expense",
  description: "",
  amount: "",
  category: categories.expense[0],
  date: getTodayValue(),
};

export default function App() {
  const [language, setLanguage] = useState(() => getStoredLanguagePreference());
  const [transactionForm, setTransactionForm] = useState(defaultTransactionForm);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [budgetForm, setBudgetForm] = useState({ category: categories.expense[0], amount: "" });
  const [editingBudgetCategory, setEditingBudgetCategory] = useState(null);
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
  const [actionSuccess, setActionSuccess] = useState("");
  const [themePreference, setThemePreference] = useState(() => getStoredThemePreference());
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [transactionPage, setTransactionPage] = useState(1);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  const importInputRef = useRef(null);
  const copy = translations[language];
  const locale = language === "th" ? "th-TH" : "en-US";
  const resolvedTheme = themePreference === "system" ? systemTheme : themePreference;
  const descriptionSuggestions = getDescriptionSuggestions(language, transactionForm.type, transactionForm.category);
  const sortOptions = [
    { value: "date_desc", label: copy.newestDate },
    { value: "date_asc", label: copy.oldestDate },
    { value: "amount_desc", label: copy.highestAmount },
    { value: "amount_asc", label: copy.lowestAmount },
  ];

  const user = session?.user ?? null;
  const {
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
    refreshFinance,
  } = useSupabaseFinance(user);

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
      if (event === "USER_UPDATED" || event === "SIGNED_OUT") {
        setIsRecoveryFlow(false);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!actionSuccess) return undefined;
    const timeoutId = window.setTimeout(() => setActionSuccess(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [actionSuccess]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (event) => setSystemTheme(event.matches ? "dark" : "light");
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof mediaQuery.addEventListener === "function") mediaQuery.addEventListener("change", handleThemeChange);
    else mediaQuery.addListener(handleThemeChange);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") mediaQuery.removeEventListener("change", handleThemeChange);
      else mediaQuery.removeListener(handleThemeChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = resolvedTheme;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", resolvedTheme === "dark" ? "#071116" : "#f4efe6");
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("fintrack-theme", themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("fintrack-language", language);
  }, [language]);
  useEffect(() => {
    setTransactionForm((current) => {
      const nextCategories = categories[current.type];
      if (nextCategories.includes(current.category)) return current;
      return { ...current, category: nextCategories[0] };
    });
  }, [transactionForm.type]);

  const deferredTransactions = useDeferredValue(financeState.transactions);
  const formatMoney = (value) => formatCurrency(value, locale, "THB");
  const formatDate = (value) => formatDisplayDate(value, locale);
  const formatMonth = (monthKey) => formatMonthLabel(monthKey, locale);
  const getCategoryDisplay = (category) => getCategoryLabel(language, category);
  const last30DaysStart = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    return start.toISOString().slice(0, 10);
  }, []);

  const last30DayTransactions = useMemo(() => deferredTransactions.filter((transaction) => transaction.date >= last30DaysStart), [deferredTransactions, last30DaysStart]);

  const filteredTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const nextItems = deferredTransactions.filter((transaction) => {
      const matchesType = typeFilter === "all" ? true : transaction.type === typeFilter;
      const matchesFrom = fromDate ? transaction.date >= fromDate : true;
      const matchesTo = toDate ? transaction.date <= toDate : true;
      const translatedCategory = getCategoryDisplay(transaction.category).toLowerCase();
      const matchesSearch = query ? `${transaction.description} ${transaction.category} ${translatedCategory} ${transaction.amount}`.toLowerCase().includes(query) : true;
      return matchesType && matchesFrom && matchesTo && matchesSearch;
    });

    return nextItems.sort((a, b) => {
      if (sortBy === "date_asc") return new Date(a.date) - new Date(b.date);
      if (sortBy === "amount_desc") return b.amount - a.amount;
      if (sortBy === "amount_asc") return a.amount - b.amount;
      return new Date(b.date) - new Date(a.date);
    });
  }, [deferredTransactions, fromDate, searchTerm, sortBy, toDate, typeFilter, language]);

  useEffect(() => {
    setTransactionPage(1);
  }, [fromDate, searchTerm, sortBy, toDate, typeFilter, language]);

  const totalTransactionPages = Math.max(1, Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE));
  const paginatedTransactions = useMemo(() => {
    const startIndex = (transactionPage - 1) * TRANSACTIONS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + TRANSACTIONS_PER_PAGE);
  }, [filteredTransactions, transactionPage]);

  const summary = useMemo(() => {
    const income = sumAmounts(last30DayTransactions.filter((item) => item.type === "income"));
    const expense = sumAmounts(last30DayTransactions.filter((item) => item.type === "expense"));
    const net = income - expense;
    const totalMoney = sumAmounts(deferredTransactions.filter((item) => item.type === "income")) - sumAmounts(deferredTransactions.filter((item) => item.type === "expense"));
    const budgetTotal = Object.values(financeState.budgets).reduce((sum, value) => sum + value, 0);
    const budgetUsedPercent = budgetTotal > 0 ? Math.min((expense / budgetTotal) * 100, 999) : 0;
    return { income, expense, net, totalMoney, budgetUsedPercent, budgetTotal };
  }, [deferredTransactions, financeState.budgets, last30DayTransactions]);

  const categorySpending = useMemo(() => last30DayTransactions.filter((item) => item.type === "expense").reduce((acc, transaction) => {
    acc[transaction.category] = (acc[transaction.category] ?? 0) + transaction.amount;
    return acc;
  }, {}), [last30DayTransactions]);

  const categoryEntries = useMemo(() => Object.entries(categorySpending).sort((a, b) => b[1] - a[1]), [categorySpending]);
  const budgetEntries = useMemo(() => Object.entries(financeState.budgets).sort((a, b) => a[0].localeCompare(b[0], locale)), [financeState.budgets, locale]);
  const reportRows = useMemo(() => {
    const byMonth = deferredTransactions.reduce((acc, transaction) => {
      const key = transaction.date.slice(0, 7);
      if (!acc[key]) acc[key] = { income: 0, expense: 0 };
      acc[key][transaction.type] += transaction.amount;
      return acc;
    }, {});

    return Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).map(([monthKey, values]) => ({ monthKey, income: values.income, expense: values.expense, net: values.income - values.expense }));
  }, [deferredTransactions]);

  const switchAuthMode = (nextMode) => {
    setAuthMode(nextMode);
    setAuthError("");
    setAuthInfo("");
    setLoginForm((current) => ({ ...current, password: nextMode === "reset" ? "" : current.password }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (!loginForm.email.trim()) return setAuthError(copy.authEnterEmail);
    if (authMode !== "reset" && !loginForm.password) return setAuthError(copy.authEnterPassword);
    if (!supabase) return setAuthError(copy.supabaseNotReady);

    setIsSubmittingAuth(true);
    setAuthError("");
    setAuthInfo("");

    if (authMode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginForm.email.trim(), password: loginForm.password });
      if (signInError) setAuthError(signInError.message);
      else setLoginForm({ email: "", password: "" });
    } else if (authMode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({ email: loginForm.email.trim(), password: loginForm.password });
      if (signUpError) setAuthError(signUpError.message);
      else {
        setAuthInfo(copy.signupSuccess);
        setAuthMode("signin");
      }
    } else {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(loginForm.email.trim(), { redirectTo: window.location.origin });
      if (resetError) setAuthError(resetError.message);
      else {
        setAuthInfo(copy.resetSent);
        setAuthMode("signin");
      }
    }

    setIsSubmittingAuth(false);
  };

  const handleRecoverySubmit = async (event) => {
    event.preventDefault();
    if (!recoveryForm.password || !recoveryForm.confirmPassword) return setRecoveryError(copy.enterNewPassword);
    if (recoveryForm.password.length < 6) return setRecoveryError(copy.passwordTooShort);
    if (recoveryForm.password !== recoveryForm.confirmPassword) return setRecoveryError(copy.passwordMismatch);
    if (!supabase) return setRecoveryError(copy.supabaseNotReady);

    setIsSubmittingRecovery(true);
    setRecoveryError("");
    setRecoveryInfo("");
    const { error: updateError } = await supabase.auth.updateUser({ password: recoveryForm.password });
    if (updateError) setRecoveryError(updateError.message);
    else {
      setRecoveryInfo(copy.passwordUpdated);
      setRecoveryForm({ password: "", confirmPassword: "" });
      setIsRecoveryFlow(false);
    }
    setIsSubmittingRecovery(false);
  };

  const handleLogout = async () => {
    setActionError("");
    setActionSuccess("");
    setIsEntryOpen(false);
    setIsRecoveryFlow(false);
    setEditingTransactionId(null);
    if (supabase) await supabase.auth.signOut();
  };

  const closeEntryDrawer = () => {
    setIsEntryOpen(false);
    setEditingTransactionId(null);
    setTransactionForm(defaultTransactionForm);
  };

  const openEntryDrawer = (type = "expense") => {
    setActionError("");
    setActionSuccess("");
    setEditingTransactionId(null);
    setTransactionForm({ type, description: "", amount: "", category: categories[type][0], date: getTodayValue() });
    setIsEntryOpen(true);
  };

  const handleEditTransaction = (transaction) => {
    setActionError("");
    setActionSuccess("");
    setEditingTransactionId(transaction.id);
    setTransactionForm({ type: transaction.type, description: transaction.description ?? "", amount: String(transaction.amount), category: transaction.category, date: transaction.date });
    setIsEntryOpen(true);
  };
  const handleTransactionSubmit = async (event) => {
    event.preventDefault();
    setActionError("");
    setActionSuccess("");
    const amount = Number(transactionForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return setActionError(copy.amountGreaterZero);

    const payload = { type: transactionForm.type, description: transactionForm.description.trim(), amount, category: transactionForm.category, date: transactionForm.date };
    const result = editingTransactionId ? await updateTransaction(editingTransactionId, payload) : await addTransaction(payload);
    if (result.error) return setActionError(result.error.message ?? copy.saveTransactionError);
    setActionSuccess(editingTransactionId ? copy.transactionUpdated : copy.transactionSaved);
    closeEntryDrawer();
  };

  const handleBudgetSubmit = async (event) => {
    event.preventDefault();
    setActionError("");
    setActionSuccess("");
    const amount = Number(budgetForm.amount);
    if (Number.isNaN(amount) || amount < 0) return setActionError(copy.budgetMinZero);
    const wasEditing = Boolean(editingBudgetCategory);
    const result = await saveBudget(budgetForm.category, amount);
    if (result.error) return setActionError(result.error.message ?? copy.saveBudgetError);
    setActionSuccess(wasEditing ? copy.budgetUpdated : copy.budgetSaved);
    setBudgetForm({ category: categories.expense[0], amount: "" });
    setEditingBudgetCategory(null);
  };

  const handleEditBudget = (category, amount) => {
    setEditingBudgetCategory(category);
    setBudgetForm({ category, amount: String(amount) });
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm(copy.deleteConfirm)) return;
    setActionError("");
    setActionSuccess("");
    const result = await deleteTransaction(transactionId);
    if (result.error) return setActionError(result.error.message ?? copy.deleteTransactionError);
    setActionSuccess(copy.transactionDeleted);
  };

  const handleExportJson = () => {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), transactions: financeState.transactions, budgets: financeState.budgets }, null, 2);
    downloadFile(`fintrack-${getTodayValue()}.json`, payload, "application/json");
    setActionSuccess(copy.jsonExported);
  };

  const handleExportCsv = () => {
    const header = ["date", "type", "category", "description", "amount"];
    const rows = filteredTransactions.map((item) => [item.date, item.type, item.category, item.description ?? "", item.amount]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    downloadFile(`fintrack-${getTodayValue()}.csv`, csv, "text/csv;charset=utf-8;");
    setActionSuccess(copy.csvExported);
  };

  const handleImportJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const result = await replaceFinanceData({ transactions: parsed.transactions ?? [], budgets: parsed.budgets ?? {} });
      if (result.error) setActionError(result.error.message ?? copy.importDataError);
      else setActionSuccess(copy.dataImported);
    } catch {
      setActionError(copy.invalidJson);
    }
    event.target.value = "";
  };

  const handleRefresh = async () => {
    setActionError("");
    setActionSuccess("");
    const result = await refreshFinance();
    if (result.error) {
      setActionError(result.error.message ?? copy.refreshError);
      return;
    }
    setActionSuccess(copy.refreshSuccess);
  };

  const themeSwitcher = (
    <div className="theme-switcher" role="group" aria-label="Theme mode">
      {themeOptions.map((option) => (
        <button key={option.value} className={themePreference === option.value ? "theme-chip active" : "theme-chip"} type="button" onClick={() => setThemePreference(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );

  const languageSwitcher = (
    <div className="theme-switcher" role="group" aria-label="Language mode">
      {languageOptions.map((option) => (
        <button key={option.value} className={language === option.value ? "theme-chip active" : "theme-chip"} type="button" onClick={() => setLanguage(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );

  const syncLabel = !isOnline ? copy.offlineCopy : isSyncing ? copy.syncingCopy : lastSyncedAt ? `${copy.lastSync} ${new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(lastSyncedAt))}` : copy.readyToSync;

  if (!hasSupabaseConfig) return <div className="lock-screen-shell"><section className="lock-card">{themeSwitcher}{languageSwitcher}<p className="eyebrow">{copy.supabaseSetup}</p><h1 className="lock-title">{copy.supabaseMissingTitle}</h1><p className="lock-copy">{copy.supabaseMissingCopy}</p></section></div>;
  if (!authReady) return <div className="lock-screen-shell"><section className="lock-card">{themeSwitcher}{languageSwitcher}<p className="eyebrow">{copy.secureAccess}</p><h1 className="lock-title">{copy.connectingTitle}</h1><p className="lock-copy">{copy.connectingCopy}</p></section></div>;

  if (isRecoveryFlow && user) {
    return <div className="lock-screen-shell"><section className="lock-card">{themeSwitcher}{languageSwitcher}<p className="eyebrow">{copy.passwordRecovery}</p><h1 className="lock-title">{copy.recoveryTitle}</h1><p className="lock-copy">{copy.recoveryCopy}</p><form className="lock-form" onSubmit={handleRecoverySubmit}><label><span>{copy.newPassword}</span><input className="pin-input" type="password" autoComplete="new-password" placeholder={copy.newPasswordPlaceholder} value={recoveryForm.password} onChange={(event) => setRecoveryForm((current) => ({ ...current, password: event.target.value }))} required /></label><label><span>{copy.confirmPassword}</span><input className="pin-input" type="password" autoComplete="new-password" placeholder={copy.confirmPasswordPlaceholder} value={recoveryForm.confirmPassword} onChange={(event) => setRecoveryForm((current) => ({ ...current, confirmPassword: event.target.value }))} required /></label>{recoveryError ? <p className="pin-error">{recoveryError}</p> : null}{recoveryInfo ? <p className="auth-info">{recoveryInfo}</p> : null}<button className="primary-btn" type="submit" disabled={isSubmittingRecovery}>{isSubmittingRecovery ? copy.saving : copy.saveNewPassword}</button></form></section></div>;
  }

  if (!user) {
    return <div className="lock-screen-shell"><section className="lock-card">{themeSwitcher}{languageSwitcher}<p className="eyebrow">{copy.secureAccess}</p><h1 className="lock-title">{copy.signInTitle}</h1><p className="lock-copy">{copy.signInCopy}</p><div className="toggle-bar auth-toggle" role="tablist" aria-label="Authentication mode"><button className={authMode === "signin" ? "toggle-option active income" : "toggle-option"} type="button" onClick={() => switchAuthMode("signin")}>{copy.signIn}</button><button className={authMode === "signup" ? "toggle-option active expense" : "toggle-option"} type="button" onClick={() => switchAuthMode("signup")}>{copy.signUp}</button></div><form className="lock-form" onSubmit={handleAuthSubmit}><label><span>{copy.email}</span><input type="email" autoComplete="email" placeholder="you@example.com" value={loginForm.email} onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))} required /></label>{authMode !== "reset" ? <label><span>{copy.password}</span><input className="pin-input" type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} placeholder={copy.passwordPlaceholder} value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} required /></label> : null}{authError ? <p className="pin-error">{authError}</p> : null}{authInfo ? <p className="auth-info">{authInfo}</p> : null}<button className="primary-btn" type="submit" disabled={isSubmittingAuth}>{isSubmittingAuth ? copy.working : authMode === "signin" ? copy.signIn : authMode === "signup" ? copy.createAccount : copy.sendResetLink}</button><div className="auth-link-row">{authMode === "signin" ? <button className="auth-link-btn" type="button" onClick={() => switchAuthMode("reset")}>{copy.forgotPassword}</button> : null}{authMode === "reset" ? <button className="auth-link-btn" type="button" onClick={() => switchAuthMode("signin")}>{copy.backToSignIn}</button> : null}</div></form></section></div>;
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">{copy.dashboardEyebrow}</p>
          <h1>{copy.dashboardTitle}</h1>
          <p className="hero-copy">{copy.dashboardCopy}</p>
        </div>
        <div className="hero-side">
          {themeSwitcher}
          {languageSwitcher}
          <div className="hero-stat"><span>{copy.last30Days}</span><strong>{formatMoney(summary.net)}</strong><small>{user.email}</small></div>
          <button className="logout-btn" type="button" onClick={handleLogout}>{copy.logout}</button>
        </div>
      </header>
      <div className="panel notice-panel sync-panel"><strong>{isOnline ? (isSyncing ? copy.syncing : copy.connected) : copy.offline}</strong><div className="sync-actions"><span>{syncLabel}</span><button className="close-btn sync-refresh-btn" type="button" onClick={handleRefresh} disabled={isSyncing || isLoading}>{isSyncing ? copy.refreshing : copy.refresh}</button></div></div>
      {error || actionError ? <div className="panel notice-panel error">{actionError || error}</div> : null}
      {actionSuccess ? <div className="panel notice-panel success">{actionSuccess}</div> : null}
      {isLoading ? <div className="panel notice-panel">{copy.loadingData}</div> : null}

      <main className="layout compact-layout">
        <section className="summary-grid">
          <SummaryCard tone="balance" label={copy.totalMoney} value={formatMoney(summary.totalMoney)} />
          <SummaryCard tone="income" label={copy.incomeThisMonth} value={formatMoney(summary.income)} />
          <SummaryCard tone="expense" label={copy.expenseThisMonth} value={formatMoney(summary.expense)} />
          <SummaryCard tone="balance" label={copy.netThisMonth} value={formatMoney(summary.net)} />
          <SummaryCard tone="budget" label={copy.budgetUsage} value={summary.budgetTotal > 0 ? `${summary.budgetUsedPercent.toFixed(0)}%` : copy.noBudgetYet} />
        </section>

        <section className="panel full-span tools-panel">
          <div className="panel-head"><h2>{copy.toolsTitle}</h2><p>{copy.toolsCopy}</p></div>
          <div className="tools-grid">
            <label><span>{copy.fromDate}</span><DateField value={fromDate} onChange={setFromDate} placeholder={copy.datePlaceholder} pickDateLabel={copy.pickDate} clearDateLabel={copy.clearDate} /></label>
            <label><span>{copy.toDate}</span><DateField value={toDate} onChange={setToDate} placeholder={copy.datePlaceholder} pickDateLabel={copy.pickDate} clearDateLabel={copy.clearDate} /></label>
            <label><span>{copy.type}</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">{copy.all}</option><option value="income">{copy.income}</option><option value="expense">{copy.expense}</option></select></label>
            <label><span>{copy.search}</span><input type="search" placeholder={copy.searchPlaceholder} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></label>
            <label><span>{copy.sort}</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          </div>
          <div className="tools-actions">
            <button className="close-btn" type="button" onClick={() => { setFromDate(""); setToDate(""); setTypeFilter("all"); setSearchTerm(""); setSortBy("date_desc"); }}>{copy.clearFilters}</button>
            <button className="close-btn" type="button" onClick={handleExportJson}>{copy.exportJson}</button>
            <button className="close-btn" type="button" onClick={handleExportCsv}>{copy.exportCsv}</button>
            <button className="close-btn" type="button" onClick={() => importInputRef.current?.click()}>{copy.importJson}</button>
            <input ref={importInputRef} className="hidden-input" type="file" accept="application/json" onChange={handleImportJson} />
          </div>
        </section>

        <section className="panel chart-panel"><div className="panel-head"><h2>{copy.chartTitle}</h2><p>{copy.chartCopy}</p></div>{categoryEntries.length === 0 ? <EmptyState message={copy.emptyState} /> : <ChartList entries={categoryEntries} formatMoney={formatMoney} getCategoryLabel={getCategoryDisplay} />}</section>

        <section className="panel budget-panel">
          <div className="panel-head panel-head-row"><div><h2>{copy.budgetTitle}</h2><p>{editingBudgetCategory ? `${copy.editing} ${getCategoryDisplay(editingBudgetCategory)}` : copy.budgetCopy}</p></div><div className="panel-head-metric"><span>{copy.budgetTotalLabel}</span><strong>{formatMoney(summary.budgetTotal)}</strong></div></div>
          <form className="split budget-form" onSubmit={handleBudgetSubmit}>
            <label><span>{copy.category}</span><select value={budgetForm.category} onChange={(event) => setBudgetForm((current) => ({ ...current, category: event.target.value }))}>{categories.expense.map((category) => <option key={category} value={category}>{getCategoryDisplay(category)}</option>)}</select></label>
            <label><span>{copy.budgetAmount}</span><input type="number" min="0" step="0.01" placeholder="0.00" value={budgetForm.amount} onChange={(event) => setBudgetForm((current) => ({ ...current, amount: event.target.value }))} required /></label>
            <button className="secondary-btn" type="submit">{editingBudgetCategory ? copy.updateBudget : copy.saveBudget}</button>
            {editingBudgetCategory ? <button className="close-btn budget-cancel-btn" type="button" onClick={() => { setEditingBudgetCategory(null); setBudgetForm({ category: categories.expense[0], amount: "" }); }}>{copy.cancel}</button> : null}
          </form>
          {budgetEntries.length === 0 ? <EmptyState message={copy.emptyState} /> : <BudgetList entries={budgetEntries} categorySpending={categorySpending} onEdit={handleEditBudget} labels={{ overBudget: copy.overBudget, nearBudget: copy.nearBudget, inBudget: copy.inBudget, editBudget: copy.editBudget }} formatMoney={formatMoney} getCategoryLabel={getCategoryDisplay} />}
        </section>

        <section className="panel report-panel full-span"><div className="panel-head"><h2>{copy.reportTitle}</h2><p>{copy.reportCopy}</p></div>{reportRows.length === 0 ? <EmptyState message={copy.emptyState} /> : <div className="report-list">{reportRows.map((row) => <article className="report-item" key={row.monthKey}><div><strong>{formatMonth(row.monthKey)}</strong></div><div className="report-metrics"><span>{copy.reportIncome} {formatMoney(row.income)}</span><span>{copy.reportExpense} {formatMoney(row.expense)}</span><strong className={row.net >= 0 ? "report-net positive" : "report-net negative"}>{formatMoney(row.net)}</strong></div></article>)}</div>}</section>

        <section className="panel transaction-panel full-span">
          <div className="panel-head"><h2>{copy.transactionsTitle}</h2><p>{copy.transactionsCopy}</p></div>
          {filteredTransactions.length === 0 ? <EmptyState message={copy.emptyState} /> : <>
            <TransactionList items={paginatedTransactions.map((item) => ({ ...item, amountLabel: `${item.type === "expense" ? "-" : "+"}${formatMoney(item.amount)}`, typeLabel: item.type === "expense" ? copy.expense : copy.income, dateLabel: formatDate(item.date), categoryLabel: getCategoryDisplay(item.category) }))} onEdit={handleEditTransaction} onRemove={handleDeleteTransaction} labels={{ noDescription: copy.noDescription, edit: copy.edit, delete: copy.delete }} />
            <div className="transaction-pagination">
              <span>{copy.transactionPageStatus.replace("{current}", String(transactionPage)).replace("{total}", String(totalTransactionPages))}</span>
              <div className="transaction-pagination-actions">
                <button className="close-btn" type="button" onClick={() => setTransactionPage((current) => Math.max(1, current - 1))} disabled={transactionPage === 1}>{copy.previousPage}</button>
                <button className="close-btn" type="button" onClick={() => setTransactionPage((current) => Math.min(totalTransactionPages, current + 1))} disabled={transactionPage === totalTransactionPages}>{copy.nextPage}</button>
              </div>
            </div>
          </>}
        </section>
      </main>

      <div className="fab-entry-group" aria-label={copy.quickAdd}>
        <button className="fab-entry fab-entry-income" type="button" onClick={() => openEntryDrawer("income")}><span className="fab-plus">+</span><span className="fab-label">{copy.fabIncome}</span></button>
        <button className="fab-entry fab-entry-expense" type="button" onClick={() => openEntryDrawer("expense")}><span className="fab-plus">+</span><span className="fab-label">{copy.fabExpense}</span></button>
      </div>

      {isEntryOpen ? <div className="entry-overlay" onClick={closeEntryDrawer}><section className="entry-drawer panel" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" aria-hidden="true" /><div className="panel-head entry-head"><div><h2>{editingTransactionId ? copy.editTransactionTitle : transactionForm.type === "income" ? copy.addIncomeTitle : copy.addExpenseTitle}</h2><p>{copy.entryCopy}</p></div><button className="close-btn" type="button" onClick={closeEntryDrawer}>{copy.close}</button></div><form className="stack" onSubmit={handleTransactionSubmit}><label><span>{copy.category}</span><select value={transactionForm.category} onChange={(event) => setTransactionForm((current) => ({ ...current, category: event.target.value }))}>{categories[transactionForm.type].map((category) => <option key={category} value={category}>{getCategoryDisplay(category)}</option>)}</select></label><label><span>{copy.description}</span><input type="text" placeholder={transactionForm.type === "expense" ? copy.expensePlaceholder : copy.incomePlaceholder} value={transactionForm.description} onChange={(event) => setTransactionForm((current) => ({ ...current, description: event.target.value }))} /></label><div className="quick-fill-row">{descriptionSuggestions.map((preset) => <button key={preset} className="quick-fill-chip" type="button" onClick={() => setTransactionForm((current) => ({ ...current, description: preset }))}>{preset}</button>)}</div><div className="split"><label><span>{copy.amount}</span><input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={transactionForm.amount} onChange={(event) => setTransactionForm((current) => ({ ...current, amount: event.target.value }))} required /><small className="field-hint">{Number(transactionForm.amount) > 0 ? formatMoney(Number(transactionForm.amount)) : copy.amountHint}</small></label><label><span>{copy.date}</span><DateField value={transactionForm.date} onChange={(value) => setTransactionForm((current) => ({ ...current, date: value }))} placeholder={copy.datePlaceholder} pickDateLabel={copy.pickDate} clearDateLabel={copy.clearDate} required /></label></div><button className="primary-btn" type="submit">{editingTransactionId ? copy.updateTransaction : copy.saveTransaction}</button></form></section></div> : null}
    </div>
  );
}


function DateField({ value, onChange, placeholder, pickDateLabel, clearDateLabel, required = false }) {
  const pickerRef = useRef(null);
  const [draftValue, setDraftValue] = useState(() => formatDateFieldValue(value));

  useEffect(() => {
    setDraftValue(formatDateFieldValue(value));
  }, [value]);

  const commitDraftValue = () => {
    const normalized = normalizeDateFieldValue(draftValue);
    if (normalized) {
      setDraftValue(formatDateFieldValue(normalized));
      onChange(normalized);
      return;
    }

    if (!draftValue.trim()) {
      onChange("");
      setDraftValue("");
      return;
    }

    setDraftValue(formatDateFieldValue(value));
  };

  const openPicker = () => {
    if (!pickerRef.current) return;
    if (typeof pickerRef.current.showPicker === "function") pickerRef.current.showPicker();
    else pickerRef.current.focus();
  };

  return (
    <div className="date-field-row">
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={draftValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);
          if (!nextValue.trim()) onChange("");
          else {
            const normalized = normalizeDateFieldValue(nextValue);
            if (normalized) onChange(normalized);
          }
        }}
        onBlur={commitDraftValue}
        required={required}
      />
      <input
        ref={pickerRef}
        className="date-picker-native"
        type="date"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setDraftValue(formatDateFieldValue(event.target.value));
        }}
        tabIndex={-1}
        aria-hidden="true"
      />
      <button className="date-picker-btn" type="button" onClick={openPicker} aria-label={pickDateLabel}>
        {pickDateLabel}
      </button>
      {!required && value ? <button className="date-clear-btn" type="button" onClick={() => { onChange(""); setDraftValue(""); }}>{clearDateLabel}</button> : null}
    </div>
  );
}

function getStoredThemePreference() {
  if (typeof window === "undefined") return "system";
  const storedValue = window.localStorage.getItem("fintrack-theme");
  return themeOptions.some((option) => option.value === storedValue) ? storedValue : "system";
}

function getStoredLanguagePreference() {
  if (typeof window === "undefined") return "en";
  const storedValue = window.localStorage.getItem("fintrack-language");
  return languageOptions.some((option) => option.value === storedValue) ? storedValue : "en";
}


function formatDateFieldValue(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function normalizeDateFieldValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const candidate = new Date(year, month - 1, day);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null;
  return `${yearValue}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function formatMonthLabel(monthKey, locale) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function downloadFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
