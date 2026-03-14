import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

function clearStoredAuth() {
  [
    "user",
    "token",
    "isAdmin",
    "role",
    "email",
    "name",
    "avatar",
  ].forEach((key) => localStorage.removeItem(key));
}

function persistAuth(userData) {
  localStorage.setItem("user", JSON.stringify(userData));
  if (userData?.token) localStorage.setItem("token", userData.token);
  if (userData?.role) localStorage.setItem("role", userData.role);
  if (userData?.name) localStorage.setItem("name", userData.name);
  if (userData?.email) localStorage.setItem("email", userData.email);
}

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
    }
    setAuthReady(true);
  }, []);

  const login = (userData) => {
    clearStoredAuth();
    persistAuth(userData);
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
    setIsLoggedIn(false);
    setAuthReady(true);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, authReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
