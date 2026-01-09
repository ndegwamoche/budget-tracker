import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase-config";

export async function ensureUncategorized(userId: string) {
  const q = query(
    collection(db, "categories"),
    where("userId", "==", userId),
    limit(1)
  );

  const snap = await getDocs(q);
  if (!snap.empty) return; // already exists

  await addDoc(collection(db, "categories"), {
    userId,
    name: "Uncategorized",
    createdAt: serverTimestamp(),
  });
}
