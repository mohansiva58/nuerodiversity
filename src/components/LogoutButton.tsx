import React from 'react';
import { useAuth } from '../pages/AuthContext'; // Ensure the path is correct

const LogoutButton: React.FC = () => {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
    >
      
    </button>
  );
};

export default LogoutButton;
