# SpendWise – Expense Tracker

SpendWise is a modern **expense tracking web application** built with **React, TypeScript, Firebase Authentication, and Cloud Firestore**.  
It helps users securely track their daily expenses, view spending history, and prepare for future budgeting features.

This project is designed to be **simple, scalable, and beginner-friendly**, while still following best practices used in production applications.

---

## 🚀 Features

### Authentication

- Email & password login
- Google sign-in
- GitHub sign-in
- Secure authentication using Firebase Auth
- Automatic session persistence
- Protected routes (only logged-in users can access the app)

### Expenses

- View a list of expenses stored in Cloud Firestore
- Expenses are user-specific (each user only sees their own data)
- Fields supported:
  - Amount
  - Category
  - Note
  - Date
  - Created / updated timestamps
- Real-time updates (when using `onSnapshot`)

### UI & Layout

- Responsive design (desktop & mobile)
- Top navigation bar with:
  - App logo
  - Logged-in user avatar / email
  - Logout button
- Sidebar navigation (desktop)
- Off-canvas sidebar (mobile)
- Built entirely with **Bootstrap 5**

---

## 🛠️ Tech Stack

### Frontend

- React (Vite)
- TypeScript
- React Router v6
- Bootstrap 5
- Bootstrap Icons

### Backend (BaaS)

- Firebase Authentication
- Cloud Firestore
- Firebase Hosting (optional)

---

## 📁 Project Structure

<pre>
src/
│
├── components/
│ ├── Auth.tsx # Login page (email, Google, GitHub)
│ ├── AppLayout.tsx # Top navbar + sidebar + <Outlet />
│ ├── Dashboard.tsx # Dashboard home page
│ ├── Expenses.tsx # Expenses list (Firestore)
│
├── config/
│ └── firebase-config.ts # Firebase initialization
│
├── App.tsx # Routing & auth guard
├── main.tsx # App entry point
└── index.css # Global styles
</pre>

---

## 🔐 Authentication Flow

1. User opens the app
2. Firebase checks authentication state using `onAuthStateChanged`
3. If not logged in → user is redirected to `/`
4. If logged in → user is redirected to the protected app area
5. Logout clears the session and redirects back to login

This ensures **secure route protection** at all times.

---

## 🧭 Routing Strategy

- `/` → Login page
- `/dashboard` → Dashboard home
- `/expenses` → Expenses list
- All protected routes are wrapped in `AppLayout`
- `<Outlet />` is used to render nested routes inside the layout

Example:

```tsx
<Route path="/dashboard" element={<AppLayout user={user} />}>
  <Route index element={<Dashboard />} />
  <Route path="expenses" element={<Expenses />} />
</Route>
```

---

## 🗄️ Firestore Data Model

### Collection: `expenses`

Each document represents a single expense.

| Field         | Type      | Description                      |
| ------------- | --------- | -------------------------------- |
| `userId`      | string    | Firebase Authentication user UID |
| `amount`      | number    | Expense amount                   |
| `categoryId`  | string    | Category name or identifier      |
| `note`        | string    | Optional description             |
| `date`        | timestamp | Date of the expense              |
| `isRecurring` | boolean   | Whether the expense is recurring |
| `frequency`   | string    | Recurrence rule (future use)     |
| `active`      | boolean   | Indicates if expense is active   |
| `createdAt`   | timestamp | Creation timestamp               |
| `updatedAt`   | timestamp | Last update timestamp            |

## 🔐 Firestore Security Rules (Recommended)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /expenses/{docId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == resource.data.userId;
    }
  }
}
```

These rules ensure:

Only authenticated users can access data
Users can only read/write their own expenses
