import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../config/firebase-config";

// ─── Recharts ────────────────────────────────
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
} from "recharts";

type Expense = {
  id: string;
  userId: string;
  amount: number;
  categoryId: string;
  date: Timestamp;
};

type Category = {
  id: string;
  name: string;
  // optional: color?: string;  ← you can add later
};

function yearStart(year: number) {
  return new Date(year, 0, 1);
}

function nextYearStart(year: number) {
  return new Date(year + 1, 0, 1);
}

// Simple currency formatter – customize locale & currency
const formatCurrency = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " ";

const COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // violet
  "#f97316", // orange
];

export function Reports() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
    );
    const unsub = onSnapshot(q, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return unsub;
  }, [user?.uid]);

  // Yearly expenses
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const start = Timestamp.fromDate(yearStart(year));
    const end = Timestamp.fromDate(nextYearStart(year));
    const q = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<", end),
    );
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    });
    return unsub;
  }, [user?.uid, year]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // ─── Aggregations ───────────────────────────────────────
  const totalYear = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const monthlyData = useMemo(() => {
    const arr = new Array(12).fill(0);
    expenses.forEach((e) => {
      const m = e.date.toDate().getMonth();
      arr[m] += e.amount;
    });
    return arr.map((value, m) => ({
      month: new Date(year, m).toLocaleString(undefined, { month: "short" }),
      amount: value,
    }));
  }, [expenses, year]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
    });
    return [...map.entries()]
      .map(([catId, value]) => ({
        name: categoryMap.get(catId) || "Unknown",
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, categoryMap]);

  const avgMonthly = totalYear / 12;

  if (!user) {
    return (
      <div className="alert alert-info text-center my-5">
        Please sign in to view your yearly expense report.
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "1400px" }}>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5">
        <h2 className="mb-3 mb-md-0">
          <i className="bi bi-graph-up me-2"></i>
          {year} Expense Journey
        </h2>

        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-outline-secondary btn-sm px-3"
            onClick={() => setYear((y) => y - 1)}
          >
            ← {year - 1}
          </button>
          <span className="fs-4 fw-bold text-primary">{year}</span>
          <button
            className="btn btn-outline-secondary btn-sm px-3"
            onClick={() => setYear((y) => y + 1)}
          >
            {year + 1} →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-3 text-muted">Loading your {year} story...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="alert alert-light text-center py-5 border shadow-sm">
          <h5 className="text-muted">No expenses recorded in {year} yet.</h5>
          <p className="mb-0">Start tracking — your first story begins here.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="row g-4 mb-5">
            <div className="col-lg-4 col-md-6">
              <div className="card shadow border-0 h-100 bg-gradient-primary text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="mb-1 opacity-75">Total Spent</p>
                      <h3 className="mb-0">{formatCurrency(totalYear)}</h3>
                    </div>
                    <i className="bi bi-wallet2 fs-1 opacity-50" />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="card shadow border-0 h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">Monthly Average</p>
                  <h3>{formatCurrency(avgMonthly)}</h3>
                  <small className="text-success">
                    <i className="bi bi-arrow-up-short" />
                    target pace
                  </small>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="card shadow border-0 h-100">
                <div className="card-body">
                  <p className="text-muted mb-1">Entries</p>
                  <h3>{expenses.length}</h3>
                  <small className="text-muted">
                    {((expenses.length / 365) * 100).toFixed(1)} entries/day avg
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Charts – Row 1 */}
          <div className="row g-4 mb-5">
            {/* Pie – Categories */}
            <div className="col-lg-6">
              <div className="card shadow border-0 h-100">
                <div className="card-header border-0">
                  <h6 className="mb-0">Spending by Category</h6>
                </div>
                <div className="card-body">
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
                            percent != null && percent > 0.08
                              ? `${name} (${(percent * 100).toFixed(0)}%)`
                              : null
                          }
                          labelLine={false}
                        >
                          {categoryData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val?: number) => formatCurrency(val ?? 0)} // ← added ? and ?? 0
                          contentStyle={{
                            borderRadius: 8,
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly trend – Bar + Line */}
            <div className="col-lg-6">
              <div className="card shadow border-0 h-100">
                <div className="card-header border-0">
                  <h6 className="mb-0">Monthly Flow {year}</h6>
                </div>
                <div className="card-body">
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer>
                      <ComposedChart data={monthlyData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={formatCurrency}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(val?: number) => [
                            formatCurrency(val ?? 0), // ← added ? and ?? 0
                            "Spent",
                          ]}
                          contentStyle={{
                            borderRadius: 8,
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="amount"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                          name="Expenses"
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="#ec4899"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="Trend"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Tables – optional but kept for reference */}
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card shadow border-0">
                <div className="card-header">
                  <h6 className="mb-0">Monthly Breakdown</h6>
                </div>
                <div className="card-body p-0">
                  <table className="table table-borderless table-hover mb-0">
                    <thead className="bg-light-subtle">
                      <tr>
                        <th>Month</th>
                        <th className="text-end">Amount</th>
                        <th className="text-end">% of total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map(({ month, amount }) => (
                        <tr key={month}>
                          <td>{month}</td>
                          <td className="text-end fw-medium">
                            {formatCurrency(amount)}
                          </td>
                          <td className="text-end text-muted">
                            {totalYear > 0
                              ? ((amount / totalYear) * 100).toFixed(1) + "%"
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card shadow border-0">
                <div className="card-header">
                  <h6 className="mb-0">Top Categories</h6>
                </div>
                <div className="card-body p-0">
                  <table className="table table-borderless table-hover mb-0">
                    <thead className="bg-light-subtle">
                      <tr>
                        <th>Category</th>
                        <th className="text-end">Total</th>
                        <th className="text-end">% share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryData.slice(0, 8).map(({ name, value }) => (
                        <tr key={name}>
                          <td>
                            <span
                              className="me-2 d-inline-block rounded-circle"
                              style={{
                                width: 12,
                                height: 12,
                                backgroundColor:
                                  COLORS[
                                    categoryData.indexOf({ name, value }) %
                                      COLORS.length
                                  ],
                              }}
                            />
                            {name}
                          </td>
                          <td className="text-end fw-medium">
                            {formatCurrency(value)}
                          </td>
                          <td className="text-end text-muted">
                            {totalYear > 0
                              ? ((value / totalYear) * 100).toFixed(1) + "%"
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
