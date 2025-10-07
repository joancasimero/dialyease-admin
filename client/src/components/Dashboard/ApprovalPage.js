import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Button, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaCheckSquare, FaTrashAlt, FaUserCheck } from 'react-icons/fa';

const ApprovalPage = () => {
  const [pendingPatients, setPendingPatients] = useState([]);
  const [pendingNurses, setPendingNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  const admin = JSON.parse(localStorage.getItem('admin'));
  const token = admin?.token;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    console.log('Admin from localStorage:', admin);
    console.log('Token:', token);
    console.log('Auth header:', authHeader);
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching pending approvals...'); // Debug log
      const [patientsRes, nursesRes] = await Promise.all([
        api.get('/patients', { headers: authHeader }),
        api.get('/nurses', { headers: authHeader })
      ]);
      
      console.log('Patients response:', patientsRes.data); // Debug log
      console.log('Nurses response:', nursesRes.data); // Debug log
      
      // Handle both response formats and filter for unapproved only
      const patients = patientsRes.data.data || patientsRes.data || [];
      const nurses = nursesRes.data || [];
      
      console.log('Total patients:', patients.length);
      console.log('Total nurses:', nurses.length);
      
      const unapprovedPatients = patients.filter(p => !p.approved);
      const unapprovedNurses = nurses.filter(n => !n.approved);
      
      console.log('Unapproved patients:', unapprovedPatients.length);
      console.log('Unapproved nurses:', unapprovedNurses.length);
      
      setPendingPatients(unapprovedPatients);
      setPendingNurses(unapprovedNurses);
    } catch (err) {
      console.error('Error fetching pending approvals:', err); // Debug log
      
      // More specific error handling
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to fetch pending approvals. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const approve = async (type, id) => {
    setActionLoading(`${type}-${id}-approve`);
    try {
      await api.put(`/approval/${type}/${id}/approve`, {}, { headers: authHeader });
      fetchPending(); // Refresh the data
    } catch (err) {
      console.error('Error approving user:', err);
      setError(`Failed to approve ${type}.`);
    } finally {
      setActionLoading('');
    }
  };

  const remove = async (type, id) => {
    setActionLoading(`${type}-${id}-delete`);
    try {
      await api.delete(`/approval/${type}/${id}`, { headers: authHeader });
      fetchPending(); // Refresh the data
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(`Failed to delete ${type}.`);
    } finally {
      setActionLoading('');
    }
  };

  const renderTable = (data, type) => (
    <div style={{ padding: '0' }}>
      <Table hover responsive className="mb-0" style={{ background: 'transparent', minWidth: 800 }}>
        <thead>
          <tr
            style={{
              background: '#f8fafc',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              border: 'none',
            }}
          >
            <th style={{ border: 'none', padding: '1.25rem 1.5rem', fontFamily: "'Inter Tight', sans-serif" }}>#</th>
            <th style={{ border: 'none', padding: '1.25rem 1.5rem', fontFamily: "'Inter Tight', sans-serif" }}>Name</th>
            <th style={{ border: 'none', padding: '1.25rem 1.5rem', fontFamily: "'Inter Tight', sans-serif" }}>Email</th>
            <th style={{ border: 'none', padding: '1.25rem 1.5rem', fontFamily: "'Inter Tight', sans-serif" }}>Status</th>
            <th style={{ border: 'none', padding: '1.25rem 1.5rem', textAlign: 'center', fontFamily: "'Inter Tight', sans-serif" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '3rem 1.5rem', border: 'none', background: '#f8fafc' }}>
                <div style={{ marginBottom: "1rem" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.3 }}>
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {type === 'patient' ? 'No pending patients' : 'No pending nurses'}
                </span>
              </td>
            </tr>
          ) : data.map((u, idx) => (
            <tr
              key={u._id}
              style={{
                background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                transition: "all 0.2s ease",
                verticalAlign: "middle",
                borderLeft: "4px solid transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0f4ff";
                e.currentTarget.style.borderLeft = type === 'patient' ? "4px solid #4a6cf7" : "4px solid #10b981";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
                e.currentTarget.style.borderLeft = "4px solid transparent";
              }}
            >
              <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: type === 'patient' ? '#4a6cf7' : '#10b981', fontSize: '1rem', border: 'none', fontFamily: "'Inter Tight', sans-serif" }}>
                {idx + 1}
              </td>
              <td style={{ padding: '1.25rem 1.5rem', border: 'none' }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "1rem" 
                }}>
                  <div
                    style={{
                      width: "45px",
                      height: "45px",
                      borderRadius: "12px",
                      background: type === 'patient' 
                        ? "linear-gradient(135deg, #4a6cf7 0%, #2a3f9d 100%)"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "1.1rem",
                      flexShrink: 0,
                      boxShadow: type === 'patient'
                        ? "0 4px 12px rgba(42, 63, 157, 0.2)"
                        : "0 4px 12px rgba(16, 185, 129, 0.2)",
                      fontFamily: "'Inter Tight', sans-serif",
                    }}
                  >
                    {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#2a3f9d', fontSize: '1rem', fontFamily: "'Inter Tight', sans-serif" }}>
                      {u.firstName} {u.middleName ? u.middleName + ' ' : ''}{u.lastName}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '1.25rem 1.5rem', border: 'none' }}>
                <a href={`mailto:${u.email}`} style={{ color: '#4a6cf7', fontWeight: 500, textDecoration: 'none', fontSize: '0.9rem' }}>
                  {u.email}
                </a>
              </td>
              <td style={{ padding: '1.25rem 1.5rem', border: 'none' }}>
                <span
                  style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    color: '#92400e',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    padding: '0.375rem 0.875rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    display: 'inline-block',
                  }}
                >
                  Pending
                </span>
              </td>
              <td style={{ padding: '1.25rem 1.5rem', border: 'none', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <Button
                    onClick={() => approve(type, u._id)}
                    size="sm"
                    style={{
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
                      transition: 'all 0.2s ease',
                    }}
                    disabled={actionLoading === `${type}-${u._id}-approve`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.2)";
                    }}
                  >
                    {actionLoading === `${type}-${u._id}-approve` ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => remove(type, u._id)}
                    size="sm"
                    style={{
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
                      transition: 'all 0.2s ease',
                    }}
                    disabled={actionLoading === `${type}-${u._id}-delete`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.2)";
                    }}
                  >
                    {actionLoading === `${type}-${u._id}-delete` ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div
        style={{
          marginLeft: 240,
          padding: '2.5rem 1.5rem',
          background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f1ff 100%)',
          minHeight: '100vh',
          fontFamily: "'Inter Tight', 'Inter', 'Segoe UI', sans-serif",
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Spinner animation="border" style={{ color: "#4a6cf7", width: "3rem", height: "3rem" }} />
          <div style={{ marginTop: '1.5rem', color: '#2a3f9d', fontSize: '1.1rem', fontWeight: 600 }}>
            Loading pending approvals...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginLeft: 240,
        padding: '2.5rem 1.5rem',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f1ff 100%)',
        minHeight: '100vh',
        fontFamily: "'Inter Tight', 'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header Section */}
        <div
          style={{
            marginBottom: "2rem",
            background: "linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)",
            padding: "2rem 2.5rem",
            borderRadius: "20px",
            boxShadow: "0 8px 24px rgba(42, 63, 157, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "0.5rem",
                letterSpacing: "-0.5px",
                fontFamily: "'Inter Tight', sans-serif",
              }}
            >
              Pending Approvals
            </h2>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: 0,
                fontSize: "1rem",
                fontWeight: 500,
              }}
            >
              Review and approve patient and nurse registrations
            </p>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>PATIENTS</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff" }}>{pendingPatients.length}</div>
              </div>
            </div>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 11l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>NURSES</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff" }}>{pendingNurses.length}</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <Alert 
            variant="danger" 
            style={{ 
              marginBottom: "1.5rem",
              borderRadius: "12px",
              border: "1px solid #fecaca",
              background: "#fee2e2",
              color: "#991b1b",
              fontWeight: 600,
            }}
          >
            {error}
            <Button 
              variant="link" 
              onClick={fetchPending}
              style={{ 
                padding: '0 0.5rem', 
                textDecoration: 'none',
                color: "#dc2626",
                fontWeight: 700,
              }}
            >
              Try Again
            </Button>
          </Alert>
        )}
        {/* Patients Section */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 8px 24px rgba(42, 63, 157, 0.1)",
            overflow: "hidden",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #4a6cf7 0%, #2a3f9d 100%)",
              padding: "1.25rem 2rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h4 style={{ color: '#ffffff', fontWeight: 800, margin: 0, fontSize: "1.25rem", fontFamily: "'Inter Tight', sans-serif" }}>
              Pending Patients
            </h4>
          </div>
          {renderTable(pendingPatients, 'patient')}
        </div>

        {/* Nurses Section */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 8px 24px rgba(42, 63, 157, 0.1)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              padding: "1.25rem 2rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 11l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h4 style={{ color: '#ffffff', fontWeight: 800, margin: 0, fontSize: "1.25rem", fontFamily: "'Inter Tight', sans-serif" }}>
              Pending Nurses
            </h4>
          </div>
          {renderTable(pendingNurses, 'nurse')}
        </div>
      </div>
    </div>
  );
};

export default ApprovalPage;