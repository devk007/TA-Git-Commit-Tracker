import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { verifyAdminToken } from '../services/authService.js';
import { setAdminToken } from '../services/apiClient.js';

const AdminContext = createContext(null);

const STORAGE_KEY = 'adminToken';

export const AdminProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [lastValidatedToken, setLastValidatedToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyExistingToken = async () => {
      if (!token) {
        setAdminToken(null);
        setIsAdmin(false);
        setLastValidatedToken(null);
        setIsChecking(false);
        return;
      }

      if (token === lastValidatedToken) {
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        await verifyAdminToken(token);
        setAdminToken(token);
        setIsAdmin(true);
        setLastValidatedToken(token);
        setError(null);
      } catch (err) {
        setAdminToken(null);
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setIsAdmin(false);
        setLastValidatedToken(null);
        setError(err.response?.data?.message || 'Invalid admin token.');
      } finally {
        setIsChecking(false);
      }
    };

    verifyExistingToken();
  }, [token, lastValidatedToken]);

  const login = async (candidateToken) => {
    const trimmed = candidateToken?.trim();
    if (!trimmed) {
      const errorMessage = 'Admin token is required.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    setIsChecking(true);
    try {
      await verifyAdminToken(trimmed);
      localStorage.setItem(STORAGE_KEY, trimmed);
      setAdminToken(trimmed);
      setToken(trimmed);
      setLastValidatedToken(trimmed);
      setIsAdmin(true);
      setError(null);
    } catch (err) {
      setAdminToken(null);
      setIsAdmin(false);
      setError(err.response?.data?.message || 'Invalid admin token.');
      throw err;
    } finally {
      setIsChecking(false);
    }
  };

  const logout = () => {
    setAdminToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setIsAdmin(false);
    setLastValidatedToken(null);
    setError(null);
  };

  const value = useMemo(
    () => ({
      isAdmin,
      token,
      isChecking,
      error,
      login,
      logout,
    }),
    [isAdmin, token, isChecking, error],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
