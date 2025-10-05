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
        api.get('/approval/patients', { headers: authHeader }),
        api.get('/approval/nurses', { headers: authHeader })
      ]);
      
      console.log('Patients response:', patientsRes.data); // Debug log
      console.log('Nurses response:', nursesRes.data); // Debug log
      
      setPendingPatients(patientsRes.data || []);
      setPendingNurses(nursesRes.data || []);
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
    <div
      style={{
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 4px 18px rgba(42,63,157,0.07)',
        padding: '1.5rem 1.2rem 1.2rem 1.2rem',
        marginBottom: 32,
        minHeight: 180,
      }}
    >
      <Table hover responsive className="mb-0" style={{ background: 'transparent', minWidth: 800 }}>
        <thead>
          <tr
            style={{
              background: 'linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.05rem',
              letterSpacing: '0.5px',
              border: 'none',
            }}
          >
            <th style={{ border: 'none', borderTopLeftRadius: 12, padding: '1rem 1.2rem' }}>#</th>
            <th style={{ border: 'none', padding: '1rem 1.2rem' }}>Name</th>
            <th style={{ border: 'none', padding: '1rem 1.2rem' }}>Email</th>
            <th style={{ border: 'none', padding: '1rem 1.2rem' }}>Status</th>
            <th style={{ border: 'none', borderTopRightRadius: 12, padding: '1rem 1.2rem', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '2.5rem 0' }}>
                <span style={{ fontSize: '1.1rem' }}>
                  {type === 'patient' ? 'No pending patients' : 'No pending nurses'}
                </span>
              </td>
            </tr>
          ) : data.map((u, idx) => (
            <tr
              key={u._id}
              style={{
                background: idx % 2 === 0 ? "#f7faff" : "#fff",
                borderRadius: 14,
                transition: "background 0.2s",
                verticalAlign: "middle",
              }}
            >
              <td style={{ padding: '1rem 1.2rem', fontWeight: 600, color: '#4a6cf7', fontSize: '1.05rem', border: 'none' }}>
                {idx + 1}
              </td>
              <td style={{ padding: '1rem 1.2rem', border: 'none', fontWeight: 600, color: '#263a99' }}>
                {u.firstName} {u.middleName ? u.middleName + ' ' : ''}{u.lastName}
              </td>
              <td style={{ padding: '1rem 1.2rem', border: 'none' }}>
                <a href={`mailto:${u.email}`} style={{ color: '#2563eb', fontWeight: 500 }}>{u.email}</a>
              </td>
              <td style={{ padding: '1rem 1.2rem', border: 'none' }}>
                <Badge bg="warning" style={{ color: '#b45309', fontWeight: 600, fontSize: '1rem', background: '#fef3c7' }}>
                  Pending
                </Badge>
              </td>
              <td style={{ padding: '1rem 1.2rem', border: 'none', textAlign: 'center' }}>
                <Button
                  onClick={() => approve(type, u._id)}
                  size="sm"
                  variant="outline-success"
                  style={{
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 8,
                    marginRight: 8,
                    minWidth: 90,
                  }}
                  disabled={actionLoading === `${type}-${u._id}-approve`}
                >
                  {actionLoading === `${type}-${u._id}-approve` ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <>
                      <FaUserCheck color="green" /> Approve
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => remove(type, u._id)}
                  size="sm"
                  variant="outline-danger"
                  style={{
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 8,
                    minWidth: 90,
                  }}
                  disabled={actionLoading === `${type}-${u._id}-delete`}
                >
                  {actionLoading === `${type}-${u._id}-delete` ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <>
                      <FaTrashAlt color="#e11d48" /> Delete
                    </>
                  )}
                </Button>
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
          padding: '2.5rem 2rem 2rem 2rem',
          background: 'linear-gradient(to right, #e6f0ff, #f9fbfd)',
          minHeight: '100vh',
          fontFamily: 'Segoe UI, sans-serif',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Spinner animation="border" variant="primary" size="lg" />
          <div style={{ marginTop: '1rem', color: '#263a99', fontSize: '1.1rem' }}>
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
        padding: '2.5rem 2rem 2rem 2rem',
        background: 'linear-gradient(to right, #e6f0ff, #f9fbfd)',
        minHeight: '100vh',
        fontFamily: 'Segoe UI, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
            marginTop: 4,
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <h2
            className="mb-0 fw-bold"
            style={{
              fontSize: '2.3rem',
              fontWeight: 800,
              letterSpacing: '-1px',
              color: '#263a99',
              lineHeight: 1.1,
              background: 'linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
              textShadow: '0 2px 12px rgba(42,63,157,0.08)',
              borderRadius: '12px',
              padding: '0.2rem 1.2rem',
              boxShadow: '0 4px 18px rgba(42,63,157,0.07)',
              letterSpacing: '0.5px',
              marginBottom: 0,
            }}
          >
            Pending Approvals
          </h2>
          <div style={{ color: '#64748b', fontWeight: 500, fontSize: '1.08rem' }}>
            <span style={{ marginRight: 16 }}>
              Patients: <Badge bg="secondary">{pendingPatients.length}</Badge>
            </span>
            <span>
              Nurses: <Badge bg="secondary">{pendingNurses.length}</Badge>
            </span>
          </div>
        </div>
        {error && (
          <Alert variant="danger" style={{ marginBottom: 24 }}>
            {error}
            <Button 
              variant="link" 
              onClick={fetchPending}
              style={{ padding: '0 0.5rem', textDecoration: 'none' }}
            >
              Try Again
            </Button>
          </Alert>
        )}
        <h4 style={{ color: '#263a99', fontWeight: 700, marginTop: 24, marginBottom: 12, letterSpacing: '-0.5px' }}>
          Patients
        </h4>
        {renderTable(pendingPatients, 'patient')}
        <h4 style={{ color: '#263a99', fontWeight: 700, marginTop: 32, marginBottom: 12, letterSpacing: '-0.5px' }}>
          Nurses
        </h4>
        {renderTable(pendingNurses, 'nurse')}
      </div>
    </div>
  );
};

export default ApprovalPage;