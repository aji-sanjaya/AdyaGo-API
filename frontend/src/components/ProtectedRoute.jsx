import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from './ui/PageLoader';
import AccessDeniedPage from './AccessDeniedPage';

export default function ProtectedRoute({ children, requiredMenu }) {
  const {
    isAuthenticated,
    tempAuth,
    session,
    authorizedPaths,
    permissionsLoading,
    hasMenuPermission,
  } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // If user has performed step 1 (temp credentials ready) but not step 2 (no role selected yet)
    if (tempAuth?.user) {
      return <Navigate to="/select-role" replace />;
    }
    // Otherwise, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Universal routes allowed for all authenticated users
  const path = location.pathname.toLowerCase();
  if (path === '/home' || path === '/' || path === '/dashboard' || path === '/select-role') {
    return children;
  }

  // If permissions are currently loading on first mount and not yet in cache
  if (permissionsLoading && (!authorizedPaths || authorizedPaths.length === 0)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <PageLoader
          message="Verifying Menu Permissions..."
          subtext="Validating iDempiere role authorizations for this route"
          fullscreen
        />
      </div>
    );
  }

  // Check role authorization for this specific menu route
  const targetMenu = requiredMenu || location.pathname;
  if (!hasMenuPermission(targetMenu)) {
    return (
      <AccessDeniedPage
        attemptedPath={location.pathname}
        roleName={session?.contextDetails?.roleName || session?.roleId}
      />
    );
  }

  return children;
}

