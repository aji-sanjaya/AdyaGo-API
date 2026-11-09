import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import LoginForm from '../../../components/LoginForm';
import FeaturesShowcase from '../../../components/FeaturesShowcase';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, tempAuth, login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // If already logged in, redirect to home or select-role
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    } else if (tempAuth?.user) {
      navigate('/select-role', { replace: true });
    }
  }, [isAuthenticated, tempAuth, navigate]);

  const handleLoginSubmit = async ({ username, password, remember }) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(username, password, remember);
      navigate('/select-role');
    } catch (err) {
      const resp = err.response?.data;
      if (err.response?.status === 429 || resp?.locked) {
        const retryAfter = resp?.retry_after || 60;
        setLockoutSeconds(retryAfter);
        setError(resp?.message || `Too many failed attempts. Please wait ${retryAfter} seconds.`);
      } else {
        const msg = resp?.message || err.message || 'Invalid username or password.';
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockoutExpire = () => {
    setLockoutSeconds(0);
    setError(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      {/* Left Column: High-Tech Value Proposition Showcase */}
      <FeaturesShowcase />

      {/* Right Column: Modern High-Tech Glassmorphism Login Card */}
      <div className="lg:col-span-5 flex justify-center">
        <LoginForm
          onSubmit={handleLoginSubmit}
          onLoginSuccess={handleLoginSubmit}
          isLoading={isLoading}
          error={error}
          lockoutSeconds={lockoutSeconds}
          onLockoutExpire={handleLockoutExpire}
        />
      </div>
    </div>
  );
}

