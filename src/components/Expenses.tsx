import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../config/firebase-config";
import Swal from "sweetalert2";

type Expense = {
  id: string;
  userId: string;
  amount: number;
  categoryId: string; // category doc id
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

type FormState = {
  amount: string;
  categoryId: string;
  note: string;
  date: string; // yyyy-mm-dd
};

const defaultForm: FormState = {
  amount: "",
  categoryId: "",
  note: "",
  date: new Date().toISOString().slice(0, 10),
};

function toDateInputValue(ts?: Timestamp) {
  const d = ts?.toDate?.() ?? new Date();
  return d.toISOString().slice(0, 10);
}

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

export function Expenses() {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // month filter (defaults to current month)
  const [month, setMonth] = useState<Date>(() => new Date());

  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  const [form, setForm] = useState<FormState>(defaultForm);
  const [touched, setTouched] = useState<{
    amount: boolean;
    categoryId: boolean;
    date: boolean;
  }>({
    amount: false,
    categoryId: false,
    date: false,
  });

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // keep user in sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // --- validation ---
  const amountNum = useMemo(() => Number(form.amount), [form.amount]);
  const amountValid = useMemo(
    () => Number.isFinite(amountNum) && amountNum > 0,
    [amountNum]
  );
  const categoryValid = useMemo(
    () => form.categoryId.trim().length > 0,
    [form.categoryId]
  );
  const dateValid = useMemo(
    () => /^\d{4}-\d{2}-\d{2}$/.test(form.date),
    [form.date]
  );
  const formValid = amountValid && categoryValid && dateValid;

  // --- subscribe: categories ---
  useEffect(() => {
    if (!user) {
      setCategories([]);
      setCatLoading(false);
      return;
    }

    setCatLoading(true);

    const cq = query(
      collection(db, "categories"),
      where("userId", "==", user.uid),
      orderBy("name", "asc")
    );

    const unsub = onSnapshot(
      cq,
      (snap) => {
        const rows: Category[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setCategories(rows);
        setCatLoading(false);

        // auto-pick first category if empty
        setForm((f) =>
          f.categoryId || rows.length === 0
            ? f
            : { ...f, categoryId: rows[0].id }
        );
      },
      (err) => {
        console.error(err);
        setCatLoading(false);
      }
    );

    return unsub;
  }, [user?.uid]);

  // --- subscribe: expenses for selected month ---
  useEffect(() => {
    if (!user) {
      setItems([]);
      setPageError("You are not logged in.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    const start = Timestamp.fromDate(monthStart(month));
    const end = Timestamp.fromDate(nextMonthStart(month));

    const eq = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<", end),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(
      eq,
      (snap) => {
        const rows: Expense[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const date =
            data.date instanceof Timestamp
              ? data.date
              : Timestamp.fromDate(new Date());
          return { id: d.id, ...data, date } as Expense;
        });

        setItems(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        const msg =
          err?.code === "failed-precondition"
            ? "Missing Firestore index for (userId + date). Open the console link in the error and create the index."
            : "Failed to load expenses. Check Firestore rules and indexes.";
        setPageError(msg);
        setLoading(false);
      }
    );

    return unsub;
  }, [user?.uid, month]);

  // --- helpers ---
  function resetForm() {
    setForm((f) => ({
      ...defaultForm,
      categoryId: f.categoryId || (categories[0]?.id ?? ""),
    }));
    setTouched({ amount: false, categoryId: false, date: false });
    setEditingId(null);
    setPageError(null);
  }

  function startEdit(exp: Expense) {
    setEditingId(exp.id);
    setForm({
      amount: String(exp.amount ?? ""),
      categoryId: exp.categoryId ?? "",
      note: exp.note ?? "",
      date: toDateInputValue(exp.date),
    });
    setTouched({ amount: false, categoryId: false, date: false });
    setPageError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formatKES(n: number) {
    return (n || 0).toLocaleString();
  }

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // --- create / update ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ amount: true, categoryId: true, date: true });
    setPageError(null);

    if (!user) {
      setPageError("You are not logged in.");
      return;
    }
    if (!formValid || saving) return;

    setSaving(true);
    try {
      const dateObj = new Date(form.date + "T00:00:00");
      const payload = {
        userId: user.uid,
        amount: amountNum,
        categoryId: form.categoryId,
        note: form.note.trim() || "",
        date: Timestamp.fromDate(dateObj),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "expenses", editingId), payload);
      } else {
        await addDoc(collection(db, "expenses"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
    } catch (err: any) {
      console.error(err);
      setPageError(err?.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // --- delete ---
  async function handleDelete(id: string) {
    const result = await Swal.fire({
      title: "Delete expense?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545", // bootstrap danger
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "expenses", id));

      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Expense has been removed.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete expense.",
      });
    }
  }

  const total = useMemo(
    () => items.reduce((sum, x) => sum + (x.amount || 0), 0),
    [items]
  );

  return (
    <div className="mt-0">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="mb-0">Expenses</h4>
          <small className="text-muted">
            Add, edit, and track your spending.
          </small>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary fs-6">
            Total: {formatKES(total)}
          </span>
        </div>
      </div>

      {/* Month switcher (mobile friendly) */}
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

      {/* Form */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h5 className="mb-0">
              {editingId ? (
                <>
                  <i className="bi bi-pencil-square me-2" />
                  Edit expense
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle me-2" />
                  Add expense
                </>
              )}
            </h5>

            {editingId && (
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              {/* amount */}
              <div className="col-12 col-md-3">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className={`form-control ${
                    touched.amount && !amountValid ? "is-invalid" : ""
                  }`}
                  placeholder="e.g. 5000"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
                />
                {touched.amount && !amountValid && (
                  <div className="invalid-feedback">
                    Enter a valid amount above 0.
                  </div>
                )}
              </div>

              {/* category */}
              <div className="col-12 col-md-3">
                <label className="form-label">Category</label>
                <select
                  className={`form-select ${
                    touched.categoryId && !categoryValid ? "is-invalid" : ""
                  }`}
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, categoryId: true }))}
                  disabled={catLoading}
                >
                  <option value="" disabled>
                    {catLoading
                      ? "Loading categories..."
                      : categories.length
                      ? "Choose category"
                      : "No categories yet"}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {touched.categoryId && !categoryValid && (
                  <div className="invalid-feedback">Choose a category.</div>
                )}
              </div>

              {/* date */}
              <div className="col-12 col-md-3">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className={`form-control ${
                    touched.date && !dateValid ? "is-invalid" : ""
                  }`}
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, date: true }))}
                />
                {touched.date && !dateValid && (
                  <div className="invalid-feedback">Pick a valid date.</div>
                )}
              </div>

              {/* note */}
              <div className="col-12 col-md-3">
                <label className="form-label">Note (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Fuel, Shopping..."
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-end gap-2 mt-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!formValid || saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : editingId ? (
                  <>
                    <i className="bi bi-check2-circle me-1" />
                    Update
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-1" />
                    Add
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h5 className="mb-0">
              <i className="bi bi-receipt me-2" />
              {monthLabel(month)}
            </h5>
            <span className="text-muted small d-none d-md-inline">
              {items.length} item(s)
            </span>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div
                className="spinner-border"
                role="status"
                aria-label="Loading"
              />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted py-4">
              No expenses for this month.
            </div>
          ) : (
            <>
              {/* MOBILE CARDS */}
              <div className="d-md-none">
                <div className="list-group">
                  {items.map((x) => (
                    <div key={x.id} className="list-group-item py-3">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="flex-grow-1">
                          <div className="fw-semibold">
                            {categoryNameById.get(x.categoryId) ?? "Unknown"}
                          </div>
                          <div className="text-muted small">
                            {x.date?.toDate?.().toLocaleDateString() ?? "-"}
                            {x.note ? ` • ${x.note}` : ""}
                          </div>
                        </div>

                        <div className="text-end">
                          <div className="fw-bold">{formatKES(x.amount)}</div>
                          <div
                            className="btn-group btn-group-sm mt-2"
                            role="group"
                          >
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => startEdit(x)}
                              title="Edit"
                              aria-label="Edit"
                            >
                              <i className="bi bi-pencil-square" />
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(x.id)}
                              disabled={deletingId === x.id}
                              title="Delete"
                              aria-label="Delete"
                            >
                              {deletingId === x.id ? (
                                <span className="spinner-border spinner-border-sm" />
                              ) : (
                                <i className="bi bi-trash" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <span className="text-muted">Total</span>
                  <span className="fw-bold">{formatKES(total)}</span>
                </div>
              </div>

              {/* DESKTOP TABLE */}
              <div className="d-none d-md-block">
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Note</th>
                        <th className="text-end">Amount</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((x) => (
                        <tr key={x.id}>
                          <td>
                            {x.date?.toDate?.().toLocaleDateString() ?? "-"}
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {categoryNameById.get(x.categoryId) ?? "Unknown"}
                            </span>
                          </td>
                          <td className="text-muted">{x.note || "-"}</td>
                          <td className="text-end fw-semibold">
                            {formatKES(x.amount)}
                          </td>
                          <td className="text-end">
                            <div
                              className="btn-group btn-group-sm"
                              role="group"
                            >
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => startEdit(x)}
                                title="Edit"
                              >
                                <i className="bi bi-pencil-square" />
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDelete(x.id)}
                                disabled={deletingId === x.id}
                                title="Delete"
                              >
                                {deletingId === x.id ? (
                                  <span className="spinner-border spinner-border-sm" />
                                ) : (
                                  <i className="bi bi-trash" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="text-end text-muted">
                          Total
                        </td>
                        <td className="text-end fw-bold">{formatKES(total)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
