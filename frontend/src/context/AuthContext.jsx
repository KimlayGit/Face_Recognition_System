import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

function getStoredUser() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("user_role");
  const email = localStorage.getItem("user_email");
  const fullName = localStorage.getItem("user_full_name");

  if (!token) return null;

  return {
    token,
    role,
    email,
    fullName,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());

  const login = (payload, emailUsedForLogin) => {
    const nextUser = {
      token: payload.access_token,
      role: payload.role,
      email: emailUsedForLogin,
      fullName: payload.full_name || payload.fullName || emailUsedForLogin,
    };

    localStorage.setItem("token", nextUser.token || "");
    localStorage.setItem("user_role", nextUser.role || "");
    localStorage.setItem("user_email", nextUser.email || "");
    localStorage.setItem("user_full_name", nextUser.fullName || "");

    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_full_name");
    setUser(null);
    window.location.href = "/login";
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAdmin: (user?.role || "").toLowerCase() === "admin",
      isTeacher: (user?.role || "").toLowerCase() === "teacher",
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}