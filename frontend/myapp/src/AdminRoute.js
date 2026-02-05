import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");

  const isAdmin =
    token &&
    email &&
    email.toLowerCase().endsWith("@pathease.com");

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
