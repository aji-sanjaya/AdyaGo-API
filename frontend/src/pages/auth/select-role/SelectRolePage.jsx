import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import ContextModal from '../../../components/ContextModal';
import FeaturesShowcase from '../../../components/FeaturesShowcase';

export default function SelectRolePage() {
  const navigate = useNavigate();
  const { tempAuth, selectContext, logout } = useAuth();

  // If no temporary auth credentials in memory/session, user must sign in first
  useEffect(() => {
    if (!tempAuth?.credentials) {
      navigate('/login', { replace: true });
    }
  }, [tempAuth, navigate]);

  if (!tempAuth?.credentials) {
    return null;
  }

  const handleContextSuccess = async (res) => {
    try {
      await selectContext({
        clientId: res.clientId,
        roleId: res.roleId,
        orgId: res.orgId,
        warehouseId: res.warehouseId,
        clientName: res.contextDetails?.clientName,
        roleName: res.contextDetails?.roleName,
        orgName: res.contextDetails?.orgName,
        warehouseName: res.contextDetails?.warehouseName,
      });
      navigate('/home', { replace: true });
    } catch (e) {
      console.error('Failed to save context session:', e);
    }
  };

  const handleBack = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      {/* Left Column: Enterprise Features Showcase */}
      <FeaturesShowcase />

      {/* Right Column: High-Tech Context Selection Card */}
      <div className="lg:col-span-5 flex justify-center">
        <ContextModal
          credentials={tempAuth.credentials}
          user={tempAuth.user}
          onSuccess={handleContextSuccess}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}

