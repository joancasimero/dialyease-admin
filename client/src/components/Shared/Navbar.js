import React, { useEffect, useState } from 'react';
import { Nav, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom'; 
import authService from '../../services/authService';
import logo from '../../assets/logo2.png';
import api from '../../services/api';

const CustomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const admin = authService.getCurrentAdmin();

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const token = admin?.token;
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
        const [patientsRes, nursesRes] = await Promise.all([
          api.get('/approval/patients', { headers: authHeader }),
          api.get('/approval/nurses', { headers: authHeader })
        ]);
        setPendingCount((patientsRes.data?.length || 0) + (nursesRes.data?.length || 0));
      } catch {
        setPendingCount(0);
      }
    };
    if (admin) fetchPending();
  }, [admin]);

  const sidebarStyle = {
    height: '100vh',
    width: '280px',
    position: 'fixed',
    top: 0,
    left: 0,
    background: 'linear-gradient(180deg, #263a99 0%, #1d2f7b 50%, #1a2865 100%)',
    color: '#fff',
    boxShadow: '4px 0 32px rgba(38, 58, 153, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2.5rem 1.5rem 1.5rem 1.5rem',
    zIndex: 1000,
    animation: 'slideInSidebar 0.6s cubic-bezier(0.4,0,0.2,1)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    borderTopRightRadius: '20px',
    borderBottomRightRadius: '20px',
  };

  const logoStyle = {
    width: 64,
    height: 64,
    objectFit: 'cover',
    marginBottom: '0.15rem',
  };

  const appNameStyle = {
    fontWeight: 800,
    fontSize: '1.5rem',
    letterSpacing: '-0.025em',
    color: '#fff',
    marginBottom: '1.5rem',
    textAlign: 'center',
    textShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    background: 'linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.9) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  const navLinkStyle = {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: 600,
    margin: '0.43rem 0',
    borderRadius: '30px',
    padding: '0.93rem 1.43rem',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    display: 'block',
    willChange: 'transform',
    letterSpacing: '0.025em',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid transparent',
  };

  const navLinkActiveStyle = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
    color: '#fff',
    transform: 'translateX(8px)',
    boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  };

  const logoutBtnStyle = {
    marginTop: 'auto',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '14px',
    color: '#fff',
    fontWeight: 600,
    padding: '0.875rem 1.5rem',
    width: '100%',
    letterSpacing: '0.025em',
    fontSize: '0.95rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
    backdropFilter: 'blur(10px)',
  };

  const isActive = (path) => location.pathname.startsWith(path);

  if (!document.getElementById('custom-navbar-animations')) {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.id = "custom-navbar-animations";
    styleSheet.innerText = `
      @keyframes slideInSidebar {
        from {
          transform: translateX(-80px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .nav-link-hover:hover {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%) !important;
        transform: translateX(4px) !important;
        color: #fff !important;
        box-shadow: 0 2px 12px rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
      }
      .logout-btn-hover:hover {
        background: linear-gradient(135deg, rgba(239, 68, 68, 1) 0%, rgba(185, 28, 28, 1) 100%) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4) !important;
      }
    `;
    document.head.appendChild(styleSheet);
  }

  return (
    <aside style={sidebarStyle}>
      <img src={logo} alt="App Logo" style={logoStyle} />
      <div style={appNameStyle}>DialyEase</div>
      <Nav className="flex-column" style={{ width: '100%' }}>
        {admin && (
          <>
            <Nav.Link
              as={Link}
              to="/dashboard"
              className="nav-link-hover"
              style={{
                ...navLinkStyle,
                ...(isActive('/dashboard') ? navLinkActiveStyle : {})
              }}
            >
              Dashboard
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/appointment-slots"
              className="nav-link-hover"
              style={{
                ...navLinkStyle,
                ...(isActive('/appointment-slots') ? navLinkActiveStyle : {})
              }}
            >
              Slots
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/attendance"
              className="nav-link-hover"
              style={{
                ...navLinkStyle,
                ...(isActive('/attendance') ? navLinkActiveStyle : {})
              }}
            >
              Attendance
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/patients"
              className="nav-link-hover"
              style={{
                ...navLinkStyle,
                ...(isActive('/patients') ? navLinkActiveStyle : {})
              }}
            >
              Patients
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/nurse"
              className="nav-link-hover"
              style={{
                ...navLinkStyle,
                ...(isActive('/nurse') ? navLinkActiveStyle : {})
              }}
            >
              Nurses
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/approval"
              className="nav-link-hover"
              style={{
                ...navLinkStyle,
                ...(isActive('/approval') ? navLinkActiveStyle : {}),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>Pending Approval</span>
              <Badge
                bg={pendingCount > 0 ? "danger" : "secondary"}
                style={{ marginLeft: 12, fontSize: '0.95em', minWidth: 28, textAlign: 'center' }}
              >
                {pendingCount}
              </Badge>
            </Nav.Link>
            {admin?.role === 'super_admin' && (
              <Nav.Link
                as={Link}
                to="/admin-management"
                className="nav-link-hover"
                style={{
                  ...navLinkStyle,
                  ...(isActive('/admin-management') ? navLinkActiveStyle : {})
                }}
              >
                Admin Management
              </Nav.Link>
            )}
          </>
        )}
      </Nav>
      {admin && (
        <Button variant="outline-light" onClick={() => {authService.logout(); navigate('/login');}} style={logoutBtnStyle} className="logout-btn-hover">
          Logout
        </Button>
      )}
    </aside>
  );
};

export default CustomNavbar;