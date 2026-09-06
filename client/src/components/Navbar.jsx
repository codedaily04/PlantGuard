/**
 * Navbar Component
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav
      style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link
          to="/dashboard"
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white',
            textDecoration: 'none',
          }}
        >
          PlantGuard AI
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link
            to="/dashboard"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '1rem',
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/plants"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '1rem',
            }}
          >
            Plants
          </Link>
          <Link
            to="/machines"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '1rem',
            }}
          >
            Machines
          </Link>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user && (
          <>
            <span style={{ fontSize: '0.9rem' }}>
              {user.name} ({user.role})
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
