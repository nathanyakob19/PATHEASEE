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

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const login = (userData) => {
    clearStoredAuth();
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
