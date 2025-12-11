// Client/src/context/AuthProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import { API_BASE, authFetch } from "../utils/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);       // in-memory token
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // login: store token in memory (or sessionStorage if you want survive reload)
  const login = async (tokenValue) => {
    setToken(tokenValue);
    // fetch me immediately
    await fetchMe(tokenValue);
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    // if used sessionStorage remove it
    sessionStorage.removeItem("token");
  }, []);

  // fetch /me endpoint
  const fetchMe = useCallback(async (overrideToken) => {
    const t = overrideToken || token || sessionStorage.getItem("token");
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await authFetch("/me", t, { method: "GET" });
      if (!res.ok) {
        // token invalid or expired
        logout();
        setLoading(false);
        return;
      }
      const json = await res.json();
      setUser(json.user);
      setLoading(false);
    } catch (err) {
      console.error("fetchMe error", err);
      setUser(null);
      setLoading(false);
    }
  }, [token, logout]);

  // Poll every 30s for fresh user data
  useEffect(() => {
    let interval = null;
    // if token present fetch immediately
    if (token) {
      fetchMe();
      interval = setInterval(() => {
        fetchMe();
      }, 30000); // 30s
    } else {
      setLoading(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, fetchMe]);

  // optional: persist token to sessionStorage to survive refresh (if you want)
  useEffect(() => {
    const saved = sessionStorage.getItem("token");
    if (saved && !token) {
      setToken(saved);
    }
  }, []);

  // when token updates persist
  useEffect(() => {
    if (token) sessionStorage.setItem("token", token);
    else sessionStorage.removeItem("token");
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

// convenience hook for consumers
export function useAuth() {
  return useContext(AuthContext);
}
