import React, { useEffect, useMemo, useState } from "react";
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

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function nextMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}
function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}
function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function formatKES(n: number) {
  return (n || 0).toLocaleString();
}
function safePctChange(prev: number, curr: number) {
  if (prev <= 0 && curr > 0) return 100;
  if (prev <= 0 && curr <= 0) return 0;
  return ((curr - prev) / prev) * 100;
}

export function Dashboard() {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // ✅ month selector for dashboard
  const [month, setMonth] = useState<Date>(() => new Date());
  const prevMonth = useMemo(() => addMonths(month, -1), [month]);

  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // categories
  const [categories, setCategories] = useState<Category[]>([]);
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // expenses
  const [monthItems, setMonthItems] = useState<Expense[]>([]);
  const [prevMonthItems, setPrevMonthItems] = useState<Expense[]>([]);
  const [recentItems, setRecentItems] = useState<Expense[]>([]);

  // keep user in sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // subscribe: categories
  useEffect(() => {
    if (!user) {
      setCategories([]);
      return;
    }

    const cq = query(
      collection(db, "categories"),
      where("userId", "==", user.uid),
      orderBy("name", "asc")
    );

    return onSnapshot(
      cq,
      (snap) => {
        const rows: Category[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setCategories(rows);
      },
      (err) => console.error(err)
    );
  }, [user?.uid]);

  // subscribe: selected month expenses
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setPageError(null);

    const start = Timestamp.fromDate(monthStart(month));
    const end = Timestamp.fromDate(nextMonthStart(month));

    const q1 = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<", end),
      orderBy("date", "desc")
    );

    return onSnapshot(
      q1,
      (snap) => {
        const rows: Expense[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setMonthItems(rows);
        setLoading(false);
      },
      (err: any) => {
        console.error(err);
        const msg =
          err?.code === "failed-precondition"
            ? "Missing Firestore index for (userId + date). Create the index from the console link in the error."
            : "Failed to load dashboard. Check Firestore rules/indexes.";
        setPageError(msg);
        setLoading(false);
      }
    );
  }, [user?.uid, month]);

  // subscribe: previous month expenses (for comparison)
  useEffect(() => {
    if (!user) return;

    const start = Timestamp.fromDate(monthStart(prevMonth));
    const end = Timestamp.fromDate(nextMonthStart(prevMonth));

    const q2 = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<", end),
      orderBy("date", "desc")
    );

    return onSnapshot(
      q2,
      (snap) => {
        const rows: Expense[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setPrevMonthItems(rows);
      },
      (err) => console.error(err)
    );
  }, [user?.uid, prevMonth]);

  // subscribe: recent expenses inside selected month (latest 8 for that month)
  useEffect(() => {
    if (!user) return;

    const start = Timestamp.fromDate(monthStart(month));
    const end = Timestamp.fromDate(nextMonthStart(month));

    const q3 = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<", end),
      orderBy("date", "desc"),
      limit(8)
    );

    return onSnapshot(
      q3,
      (snap) => {
        const rows: Expense[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setRecentItems(rows);
      },
      (err) => console.error(err)
    );
  }, [user?.uid, month]);

  const monthTotal = useMemo(
    () => monthItems.reduce((s, x) => s + (x.amount || 0), 0),
    [monthItems]
  );
  const prevTotal = useMemo(
    () => prevMonthItems.reduce((s, x) => s + (x.amount || 0), 0),
    [prevMonthItems]
  );

  const delta = monthTotal - prevTotal;
  const pct = safePctChange(prevTotal, monthTotal);

  const trend = useMemo(() => {
    if (delta > 0) return { cls: "text-danger", icon: "bi-arrow-up-right" };
    if (delta < 0) return { cls: "text-success", icon: "bi-arrow-down-right" };
    return { cls: "text-muted", icon: "bi-dash" };
  }, [delta]);

  // Top categories for selected month
  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const x of monthItems) {
      map.set(x.categoryId, (map.get(x.categoryId) || 0) + (x.amount || 0));
    }
    const arr = Array.from(map.entries())
      .map(([categoryId, total]) => ({
        categoryId,
        name: categoryNameById.get(categoryId) || "Unknown",
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const max = arr[0]?.total || 1;
    return arr.map((x) => ({ ...x, pct: Math.round((x.total / max) * 100) }));
  }, [monthItems, categoryNameById]);

  if (!user) {
    return (
      <div className="mt-0">
        <h4 className="mb-1">Dashboard</h4>
        <div className="alert alert-warning mb-0">You are not logged in.</div>
      </div>
    );
  }

  return (
    <div className="mt-0">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="mb-0">Dashboard</h4>
          <small className="text-muted">Overview by month.</small>
        </div>
      </div>

      {/* ✅ Month switcher */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-2 mb-4">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <i className="bi bi-chevron-left" />
          </button>

          <div className="text-center flex-grow-1">
            <div className="fw-semibold">{monthLabel(month)}</div>
            <div className="small text-muted">
              Compare to {monthLabel(prevMonth)}
            </div>
          </div>

          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <i className="bi bi-chevron-right" />
          </button>
        </div>

        <button
          className="btn btn-outline-primary btn-sm"
          onClick={() => setMonth(new Date())}
        >
          This month
        </button>
      </div>

      {pageError && (
        <div className="alert alert-danger" role="alert">
          {pageError}
        </div>
      )}

      {/* KPI cards */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">{monthLabel(month)} total</div>
              <div className="fs-3 fw-bold">{formatKES(monthTotal)}</div>
              <div className="text-muted small">
                {monthItems.length} expense(s)
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                {monthLabel(prevMonth)} total
              </div>
              <div className="fs-3 fw-bold">{formatKES(prevTotal)}</div>
              <div className="text-muted small">
                {prevMonthItems.length} expense(s)
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">Change</div>
              <div className={`fs-3 fw-bold ${trend.cls}`}>
                {delta >= 0 ? "+" : ""}
                {formatKES(delta)}
              </div>
              <div className={`small ${trend.cls}`}>
                <i className={`bi ${trend.icon} me-1`} />
                {Math.round(pct)}% vs previous month
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top categories + Recent */}
      <div className="row g-3">
        {/* Top categories */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="mb-0">
                  <i className="bi bi-tags me-2" />
                  Top categories
                </h6>
                <span className="text-muted small">{monthLabel(month)}</span>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div
                    className="spinner-border"
                    role="status"
                    aria-label="Loading"
                  />
                </div>
              ) : topCategories.length === 0 ? (
                <div className="text-muted text-center py-4">
                  No expenses yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {topCategories.map((c) => (
                    <div key={c.categoryId}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="fw-semibold">{c.name}</div>
                        <div className="small text-muted">
                          {formatKES(c.total)}
                        </div>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className="progress-bar"
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent expenses (for selected month) */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="mb-0">
                  <i className="bi bi-clock-history me-2" />
                  Recent expenses
                </h6>
                <span className="text-muted small">{monthLabel(month)}</span>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div
                    className="spinner-border"
                    role="status"
                    aria-label="Loading"
                  />
                </div>
              ) : recentItems.length === 0 ? (
                <div className="text-muted text-center py-4">
                  No expenses found.
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="d-md-none">
                    <div className="list-group">
                      {recentItems.map((x) => (
                        <div key={x.id} className="list-group-item py-3">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div className="flex-grow-1">
                              <div className="fw-semibold">
                                {categoryNameById.get(x.categoryId) ??
                                  "Unknown"}
                              </div>
                              <div className="text-muted small">
                                {x.date?.toDate?.().toLocaleDateString() ?? "-"}
                                {x.note ? ` • ${x.note}` : ""}
                              </div>
                            </div>
                            <div className="fw-bold">{formatKES(x.amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop table */}
                  <div className="d-none d-md-block">
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: 130 }}>Date</th>
                            <th>Category</th>
                            <th>Note</th>
                            <th className="text-end" style={{ width: 140 }}>
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentItems.map((x) => (
                            <tr key={x.id}>
                              <td>
                                {x.date?.toDate?.().toLocaleDateString() ?? "-"}
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border">
                                  {categoryNameById.get(x.categoryId) ??
                                    "Unknown"}
                                </span>
                              </td>
                              <td className="text-muted">{x.note || "-"}</td>
                              <td className="text-end fw-semibold">
                                {formatKES(x.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
