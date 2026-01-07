export function authErrorMessage(code?: string) {
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/popup-closed-by-user":
      return "Popup closed before sign-in finished.";
    case "auth/popup-blocked":
      return "Popup was blocked. Please allow popups and try again.";
    case "auth/account-exists-with-different-credential":
      return "That email is already linked to a different sign-in method.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    case "auth/unauthorized-domain":
      return "You have to be on localhost:5173";
    default:
      return "Login failed. Please try again.";
  }
}
