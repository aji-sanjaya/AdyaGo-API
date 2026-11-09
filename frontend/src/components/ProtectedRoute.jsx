import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, tempAuth } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // If user has performed step 1 (temp credentials ready) but not step 2 (no role selected yet)
    if (tempAuth?.user) {
      return <Navigate to="/select-role" replace />;
    }
    // Otherwise, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

