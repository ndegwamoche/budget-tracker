import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  limit,
} from "firebase/firestore";
import { auth, db } from "../config/firebase-config";

// Recharts imports
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  // Legend was removed
} from "recharts";

type Expense = {
  id: string;
  userId: string;
  amount: number;
  categoryId: string;
  note?: string;
  date: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

type Category = {
  id: string;
  userId: string;
  name: string;
  createdAt?: Timestamp;
};

// ─── Helpers ────────────────────────────────────────────────
function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function nextMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
function addMonths(d: Date, delta: number) {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + delta);
  return copy;
}
function monthLabel(d: Date) {
  return d.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}
function formatKES(n: number) {
  return (
    "KSh " + (n || 0).toLocaleString("en-KE", { minimumFractionDigits: 0 })
  );
}

const COLORS = [
  "#4f46e5", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#f97316", // orange
  "#6366f1", // blue-indigo
];

export function Dashboard() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [month, setMonth] = useState<Date>(new Date());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [prevExpenses, setPrevExpenses] = useState<Expense[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  // Categories
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "categories"),
      where("userId", "==", user.uid),
      orderBy("name", "asc"),
    );
    return onSnapshot(q, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, [user?.uid]);

  // Current month expenses
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const start = Timestamp.fromDate(monthStart(month));
    const end = Timestamp.fromDate(nextMonthStart(month));

    const q = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<", end),
      orderBy("date", "desc"),
    );

    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setMonthExpenses(items);
        setLoading(false);
      },
      (err: any) => {
        console.error(err);
        setError(
          err?.code === "failed-precondition"
            ? "Firestore index missing (userId + date). Click the link in console to create it."
            : "Could not load expenses. Check connection or rules.",
        );
        setLoading(false);
      },
    );
  }, [user?.uid, month]);

  // Previous month (for comparison)
  useEffect(() => {
    if (!user) return;
    const prev = addMonths(month, -1);
    const start = Timestamp.fromDate(monthStart(prev));
    const end = Timestamp.fromDate(nextMonthStart(prev));

    const q = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<", end),
      orderBy("date", "desc"),
    );

    return onSnapshot(q, (snap) => {
      setPrevExpenses(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      );
    });
  }, [user?.uid, month]);

  // Recent (top 8 current month)
  useEffect(() => {
    if (!user) return;
    const start = Timestamp.fromDate(monthStart(month));
    const end = Timestamp.fromDate(nextMonthStart(month));

    const q = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<", end),
      orderBy("date", "desc"),
      limit(8),
    );

    return onSnapshot(q, (snap) => {
      setRecentExpenses(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      );
    });
  }, [user?.uid, month]);

  // ─── Computations ───────────────────────────────────────────
  const currentTotal = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses],
  );
  const prevTotal = useMemo(
    () => prevExpenses.reduce((sum, e) => sum + e.amount, 0),
    [prevExpenses],
  );

  const change = currentTotal - prevTotal;
  const pctChange =
    prevTotal === 0 ? (currentTotal > 0 ? 100 : 0) : (change / prevTotal) * 100;

  // Category distribution for pie chart
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((e) => {
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([id, value]) => ({
        name: categoryMap.get(id) || "Other",
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthExpenses, categoryMap]);

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <h4>Please sign in to view your dashboard</h4>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "1600px" }}>
      {/* Header + Month Picker */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 gap-3">
        <div>
          <h2 className="mb-1 fw-bold">
            <i className="bi bi-speedometer2 me-2 text-primary"></i>
            Dashboard
          </h2>
          <p className="text-muted mb-0">
            Your money story — {monthLabel(month)}
          </p>
        </div>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="btn-group">
            <button
              className="btn btn-outline-secondary px-3"
              onClick={() => setMonth((m) => addMonths(m, -1))}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <button className="btn btn-outline-secondary fw-semibold px-4 disabled">
              {monthLabel(month)}
            </button>
            <button
              className="btn btn-outline-secondary px-3"
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
          <button
            className="btn btn-primary px-2"
            onClick={() => setMonth(new Date())}
          >
            This Month
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-5 my-5">
          <div
            className="spinner-border text-primary"
            style={{ width: "3rem", height: "3rem" }}
          />
          <p className="mt-3 text-muted">Loading your finances...</p>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="row g-4 mb-5">
            <div className="col-lg-4 col-md-6">
              <div className="card shadow-lg border-0 h-100 bg-gradient-primary text-white rounded-4">
                <div className="card-body p-4">
                  <h6 className="opacity-75 mb-2">Spent this month</h6>
                  <h2 className="mb-1">{formatKES(currentTotal)}</h2>
                  <small>{monthExpenses.length} transactions</small>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="card shadow-lg border-0 h-100 rounded-4">
                <div className="card-body p-4">
                  <h6 className="text-muted mb-2">Previous month</h6>
                  <h2 className="mb-1">{formatKES(prevTotal)}</h2>
                  <small>{prevExpenses.length} transactions</small>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="card shadow-lg border-0 h-100 rounded-4">
                <div className="card-body p-4">
                  <h6 className="text-muted mb-2">Change</h6>
                  <h2
                    className={`mb-1 ${change > 0 ? "text-danger" : change < 0 ? "text-success" : "text-secondary"}`}
                  >
                    {change > 0 ? "+" : ""}
                    {formatKES(Math.abs(change))}
                  </h2>
                  <div
                    className={`d-flex align-items-center gap-2 ${change > 0 ? "text-danger" : change < 0 ? "text-success" : ""}`}
                  >
                    <i
                      className={`bi ${change > 0 ? "bi-arrow-up-right" : change < 0 ? "bi-arrow-down-right" : "bi-dash"} fs-5`}
                    ></i>
                    <span>
                      {Math.round(Math.abs(pctChange))}% vs last month
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Category Breakdown – Pie + List */}
            <div className="col-lg-7">
              <div className="card shadow-lg border-0 rounded-4 h-100">
                <div className="card-header border-0 py-3">
                  <h6 className="mb-0">
                    <i className="bi bi-pie-chart-fill me-2 text-primary"></i>
                    Where your money went
                  </h6>
                </div>
                <div className="card-body">
                  {categoryData.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      No expenses this month
                    </div>
                  ) : (
                    <div className="row">
                      <div className="col-md-6">
                        <div style={{ height: 320 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={categoryData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={110}
                                label={({ name, percent }) =>
                                  percent != null && percent > 0.07
                                    ? `${name} ${(percent * 100).toFixed(0)}%`
                                    : null
                                }
                              >
                                {categoryData.map((_, i) => (
                                  <Cell
                                    key={`cell-${i}`}
                                    fill={COLORS[i % COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(val?: number) =>
                                  formatKES(val ?? 0)
                                }
                              />
                              {/* Legend has been removed */}
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="d-flex flex-column gap-3 mt-3 mt-md-0">
                          {categoryData.slice(0, 6).map((cat, i) => (
                            <div key={cat.name}>
                              <div className="d-flex justify-content-between mb-1">
                                <div>
                                  <span
                                    className="me-2 d-inline-block rounded"
                                    style={{
                                      width: 12,
                                      height: 12,
                                      backgroundColor:
                                        COLORS[i % COLORS.length],
                                    }}
                                  ></span>
                                  {cat.name}
                                </div>
                                <div className="fw-medium">
                                  {formatKES(cat.value)}
                                </div>
                              </div>
                              <div
                                className="progress"
                                style={{ height: "6px" }}
                              >
                                <div
                                  className="progress-bar"
                                  style={{
                                    width: `${(cat.value / currentTotal) * 100}%`,
                                    backgroundColor: COLORS[i % COLORS.length],
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Expenses */}
            <div className="col-lg-5">
              <div className="card shadow-lg border-0 rounded-4 h-100">
                <div className="card-header border-0 py-3">
                  <h6 className="mb-0">
                    <i className="bi bi-clock-history me-2 text-primary"></i>
                    Recent Activity
                  </h6>
                </div>
                <div className="card-body p-0">
                  {recentExpenses.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      No recent expenses
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {recentExpenses.map((exp) => (
                        <div
                          key={exp.id}
                          className="list-group-item px-4 py-3 border-0"
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{
                                  width: 48,
                                  height: 48,
                                  backgroundColor: `${COLORS[Math.floor(Math.random() * COLORS.length)]}22`,
                                }}
                              >
                                <i className="bi bi-tag-fill text-primary"></i>
                              </div>
                              <div>
                                <div className="fw-semibold">
                                  {categoryMap.get(exp.categoryId) || "Unknown"}
                                </div>
                                <div className="small text-muted">
                                  {exp.date
                                    ?.toDate?.()
                                    .toLocaleDateString("en-KE")}{" "}
                                  {exp.note ? `• ${exp.note}` : ""}
                                </div>
                              </div>
                            </div>
                            <div className="fw-bold text-danger fs-6">
                              -{formatKES(exp.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
