import React, { useEffect, useMemo, useState } from "react";
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
};

function yearStart(year: number) {
  return new Date(year, 0, 1);
}
function nextYearStart(year: number) {
  return new Date(year + 1, 0, 1);
}

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

  // load categories (for names)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "categories"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });

    return unsub;
  }, [user?.uid]);

  // load yearly expenses
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const start = Timestamp.fromDate(yearStart(year));
    const end = Timestamp.fromDate(nextYearStart(year));

    const q = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<", end)
    );

    const unsub = onSnapshot(q, (snap) => {
      setExpenses(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
      setLoading(false);
    });

    return unsub;
  }, [user?.uid, year]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // --- aggregations ---
  const totalYear = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const monthlyTotals = useMemo(() => {
    const map = new Map<number, number>();
    expenses.forEach((e) => {
      const m = e.date.toDate().getMonth(); // 0-11
      map.set(m, (map.get(m) || 0) + e.amount);
    });
    return map;
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
    });
    return map;
  }, [expenses]);

  const avgMonthly = totalYear / 12;

  function format(n: number) {
    return n.toLocaleString();
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Yearly Report</h4>

        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setYear((y) => y - 1)}
          >
            ‹
          </button>
          <strong>{year}</strong>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setYear((y) => y + 1)}
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading report…</div>
      ) : (
        <>
          {/* Summary */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="text-muted">Total spent</div>
                  <h4>{format(totalYear)}</h4>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="text-muted">Avg / month</div>
                  <h4>{format(avgMonthly)}</h4>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="text-muted">Transactions</div>
                  <h4>{expenses.length}</h4>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly table */}
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h6>Monthly breakdown</h6>
              <table className="table table-sm">
                <tbody>
                  {Array.from({ length: 12 }).map((_, m) => (
                    <tr key={m}>
                      <td>
                        {new Date(year, m).toLocaleString(undefined, {
                          month: "long",
                        })}
                      </td>
                      <td className="text-end">
                        {format(monthlyTotals.get(m) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category table */}
          <div className="card shadow-sm">
            <div className="card-body">
              <h6>By category</h6>
              <table className="table table-sm">
                <tbody>
                  {[...categoryTotals.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([catId, total]) => (
                      <tr key={catId}>
                        <td>{categoryMap.get(catId) || "Unknown"}</td>
                        <td className="text-end">{format(total)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
