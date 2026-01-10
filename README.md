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
