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

type Category = {
  id: string;
  userId: string;
  name: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export function Categories() {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // keep auth in sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  const nameValid = useMemo(() => name.trim().length >= 2, [name]);

  // subscribe to categories
  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      setPageError("You are not logged in.");
      return;
    }

    setLoading(true);
    setPageError(null);

    const q = query(
      collection(db, "categories"),
      where("userId", "==", user.uid),
      orderBy("name", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Category[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setItems(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setPageError("Failed to load categories.");
        setLoading(false);
      }
    );

    return unsub;
  }, [user?.uid]);

  function resetForm() {
    setName("");
    setTouched(false);
    setEditingId(null);
    setPageError(null);
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name ?? "");
    setTouched(false);
    setPageError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // create / update
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setPageError(null);

    if (!user) {
      setPageError("You are not logged in.");
      return;
    }
    if (!nameValid || saving) return;

    setSaving(true);
    try {
      const payload = {
        userId: user.uid,
        name: name.trim(),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "categories", editingId), payload);
      } else {
        await addDoc(collection(db, "categories"), {
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

  // delete
  async function handleDelete(cat: Category) {
    const result = await Swal.fire({
      title: "Delete category?",
      text: "Expenses using this category will show as “Unknown”.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "categories", cat.id));
      Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "Failed to delete category.",
      });
    }
  }

  return (
    <div className="mt-0">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="mb-0">Categories</h4>
          <small className="text-muted">
            Create and manage your categories.
          </small>
        </div>

        <span className="badge bg-light text-dark border">
          {items.length} total
        </span>
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
                  Edit category
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle me-2" />
                  Add category
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
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-8">
                <label className="form-label">Name</label>
                <input
                  className={`form-control ${
                    touched && !nameValid ? "is-invalid" : ""
                  }`}
                  placeholder="e.g. Rent, Food, Transport"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched(true)}
                />
                {touched && !nameValid && (
                  <div className="invalid-feedback">
                    Name must be at least 2 characters.
                  </div>
                )}
              </div>

              <div className="col-12 col-md-4 d-flex gap-2">
                <button
                  className="btn btn-primary w-100"
                  type="submit"
                  disabled={!nameValid || saving}
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

                <button
                  className="btn btn-outline-secondary w-100"
                  type="button"
                  onClick={resetForm}
                >
                  Clear
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h5 className="mb-0">
              <i className="bi bi-tags me-2" />
              Your categories
            </h5>
            <span className="text-muted small">{items.length} item(s)</span>
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
              No categories yet. Add your first one above.
            </div>
          ) : (
            <div className="list-group">
              {items.map((c) => (
                <div
                  key={c.id}
                  className="list-group-item d-flex align-items-center justify-content-between gap-2"
                >
                  <div className="fw-semibold">{c.name}</div>

                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => startEdit(c)}
                      title="Edit"
                    >
                      <i className="bi bi-pencil-square" />
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(c)}
                      title="Delete"
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
