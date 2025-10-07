import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Badge, Row, Col, Button, Form, Alert } from 'react-bootstrap';
import { FiUser, FiCalendar, FiCheckCircle, FiUserX, FiSearch, FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Modal from 'react-bootstrap/Modal';

const AttendancePage = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDate, setExportDate] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, statusFilter]);

  const getAuthHeader = () => {
    const admin = JSON.parse(localStorage.getItem('admin'));
    const token = admin?.token;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedDate) {
        params.date = selectedDate.toISOString().split('T')[0];
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await api.get('/attendance', {
        headers: getAuthHeader(),
        params
      });
      setAttendance(res.data);
    } catch (err) {
      setError('Failed to fetch attendance records');
    }
    setLoading(false);
  };

  const handleExportPDF = async () => {
    setExportError('');
    setExporting(true);
    if (!exportDate) {
      setExportError('Please select a date to export.');
      setExporting(false);
      return;
    }
    try {
      const localDate = exportDate.toISOString().split('T')[0];
      const res = await api.get(`/attendance/export/pdf?date=${localDate}`, {
        headers: getAuthHeader(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${localDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowExportModal(false);
    } catch (err) {
      setExportError('Failed to export PDF');
    }
    setExporting(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAttendance();
    setRefreshing(false);
  };

  const styles = {
    container: {
      padding: '3rem 2.5rem',
      marginLeft: 280,
      maxWidth: 'calc(100vw - 300px)',
      width: 'auto',
    },
    header: {
      color: '#1e293b',
      fontWeight: 800,
      fontSize: '3.1rem',
      marginBottom: '0.5rem',
      letterSpacing: '-0.025em',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    subtitle: {
      fontSize: '1.05rem',
      color: '#64748b',
      fontWeight: 500,
      letterSpacing: '0.025em',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
      marginBottom: '2.5rem'
    },
    card: {
      border: 'none',
      borderRadius: '20px',
      background: 'white',
      boxShadow: '0 8px 32px rgba(42, 63, 157, 0.12)',
      marginBottom: '2rem',
      overflow: 'hidden',
      padding: '2rem'
    },
    filterSection: {
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
      padding: '1.5rem',
      borderRadius: '16px',
      marginBottom: '2rem',
      border: '1px solid rgba(42, 63, 157, 0.08)'
    },
    table: {
      borderRadius: '12px',
      overflow: 'hidden',
      margin: '0',
      border: 'none',
      background: 'white'
    },
    tableHeader: {
      background: 'linear-gradient(135deg, rgba(42, 63, 157, 0.08) 0%, rgba(74, 108, 247, 0.08) 100%)',
      color: '#1e293b',
      fontWeight: 700,
      borderBottom: '2px solid rgba(42, 63, 157, 0.15)',
      fontSize: '0.9rem',
      letterSpacing: '0.025em',
      textTransform: 'uppercase'
    },
    badge: {
      fontWeight: 600,
      padding: '0.5rem 1rem',
      borderRadius: '10px',
      fontSize: '0.85rem',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
      letterSpacing: '0.025em'
    },
    filterLabel: {
      fontWeight: 700,
      color: '#1e293b',
      fontSize: '0.9rem',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
      letterSpacing: '-0.025em'
    },
    button: {
      borderRadius: '12px',
      fontWeight: 700,
      fontSize: '0.9rem',
      padding: '0.75rem 1.5rem',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
      border: 'none',
      boxShadow: '0 4px 12px rgba(42, 63, 157, 0.2)',
      transition: 'all 0.2s ease'
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <Container fluid style={styles.container}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={styles.header}>
            Attendance Records
          </h1>
          <p style={styles.subtitle}>
            Track and manage patient attendance with real-time updates
          </p>
        </div>
        
        <Card style={styles.card}>
          <div style={styles.filterSection}>
            <Row className="g-3 align-items-end">
              <Col md={5}>
                <div>
                  <label style={{ ...styles.filterLabel, display: 'block', marginBottom: '0.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
                      <rect x="3" y="6" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Filter by Date
                  </label>
                  <DatePicker
                    selected={selectedDate}
                    onChange={date => setSelectedDate(date)}
                    maxDate={new Date()}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select date"
                    className="form-control"
                    isClearable
                    style={{
                      borderRadius: '10px',
                      border: '2px solid rgba(42, 63, 157, 0.2)',
                      padding: '0.75rem 1rem',
                      fontSize: '0.95rem',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                    }}
                  />
                </div>
              </Col>
              <Col md={4}>
                <div>
                  <label style={{ ...styles.filterLabel, display: 'block', marginBottom: '0.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Status Filter
                  </label>
                  <Form.Select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{
                      borderRadius: '10px',
                      border: '2px solid rgba(42, 63, 157, 0.2)',
                      padding: '0.75rem 1rem',
                      fontSize: '0.95rem',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                      fontWeight: 600
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present Only</option>
                    <option value="absent">Absent Only</option>
                  </Form.Select>
                </div>
              </Col>
              <Col md={3}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Button 
                    style={{
                      flex: 1,
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      padding: '0.75rem 1rem',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                      border: 'none',
                      background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
                      boxShadow: '0 2px 8px rgba(42, 63, 157, 0.2)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(42, 63, 157, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(42, 63, 157, 0.2)';
                    }}
                  >
                    <FiRefreshCw style={{ fontSize: '0.95rem' }} className={refreshing ? 'spin' : ''} />
                    <span>Refresh</span>
                  </Button>
                  <Button
                    style={{
                      flex: 1,
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      padding: '0.75rem 1rem',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                      border: 'none',
                      background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                      boxShadow: '0 2px 8px rgba(100, 116, 139, 0.2)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onClick={() => setShowExportModal(true)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 116, 139, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(100, 116, 139, 0.2)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Export</span>
                  </Button>
                </div>
              </Col>
            </Row>
          </div>
          
          {error && (
            <Alert 
              variant="danger" 
              style={{ 
                borderRadius: '12px', 
                marginBottom: '1.5rem',
                border: 'none',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                color: '#dc2626',
                fontWeight: 600,
                padding: '1rem 1.25rem',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.75rem', verticalAlign: 'middle' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {error}
            </Alert>
          )}
          
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(42, 63, 157, 0.1)' }}>
            <Table hover style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', borderBottom: '2px solid rgba(42, 63, 157, 0.15)' }}>Patient</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center', borderBottom: '2px solid rgba(42, 63, 157, 0.15)' }}>Date</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center', borderBottom: '2px solid rgba(42, 63, 157, 0.15)' }}>Status</th>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'center', borderBottom: '2px solid rgba(42, 63, 157, 0.15)' }}>Check-in Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(42, 63, 157, 0.1)',
                        borderTopColor: '#2a3f9d',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                      }}></div>
                      <div style={{ 
                        color: '#64748b', 
                        fontWeight: 600,
                        fontSize: '1rem',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>Loading attendance records...</div>
                    </td>
                  </tr>
                ) : attendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }}>
                        <path d="M9 11l3 3L22 4" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div style={{ 
                        color: '#64748b', 
                        fontWeight: 600,
                        fontSize: '1.05rem',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>
                        No attendance records found
                      </div>
                      <div style={{ 
                        color: '#9ca3af', 
                        fontSize: '0.9rem',
                        marginTop: '0.5rem',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>
                        Try adjusting your filters or select a different date
                      </div>
                    </td>
                  </tr>
                ) : (
                  attendance.map((rec, idx) => (
                    <tr 
                      key={rec._id || idx} 
                      style={{ 
                        borderBottom: '1px solid rgba(42, 63, 157, 0.08)',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(42, 63, 157, 0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ 
                        padding: '1.25rem 1.5rem',
                        fontWeight: 700, 
                        color: '#1e293b', 
                        fontSize: '0.95rem',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, rgba(42, 63, 157, 0.1) 0%, rgba(74, 108, 247, 0.15) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="8" r="4" stroke="#2a3f9d" strokeWidth="2"/>
                              <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="#2a3f9d" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>
                              {rec.patient?.firstName} {rec.patient?.lastName}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                              PID: {rec.patient?.pidNumber || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '1.25rem 1.5rem',
                        textAlign: 'center', 
                        fontWeight: 600, 
                        color: '#374151',
                        fontSize: '0.9rem',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>
                        {rec.date}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                        {rec.status === 'present' ? (
                          <Badge 
                            bg="success" 
                            style={{
                              ...styles.badge,
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.2)'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
                              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                              <path d="M9 12l2 2l4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Present
                          </Badge>
                        ) : (
                          <Badge 
                            bg="danger" 
                            style={{
                              ...styles.badge,
                              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
                              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                              <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Absent
                          </Badge>
                        )}
                      </td>
                      <td style={{ 
                        padding: '1.25rem 1.5rem',
                        textAlign: 'center', 
                        fontWeight: 600, 
                        color: '#64748b',
                        fontSize: '0.9rem',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>
                        {rec.status === 'present' && rec.time ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            {rec.time}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      </Container>

      <style>
        {`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>

      <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered>
        <div style={{
          borderRadius: '20px',
          overflow: 'hidden',
          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
        }}>
          <Modal.Header 
            closeButton
            className="border-0"
            style={{
              background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
              padding: '1.75rem 2rem',
              color: 'white'
            }}
          >
            <Modal.Title style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'white',
              fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
            }}>
              Export Attendance PDF
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '2rem', background: 'white' }}>
            {exportError && (
              <Alert 
                variant="danger" 
                style={{ 
                  borderRadius: '12px', 
                  marginBottom: '1.5rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  color: '#dc2626',
                  fontWeight: 600
                }}
              >
                {exportError}
              </Alert>
            )}
            <div>
              <label style={{ 
                fontWeight: 700, 
                color: '#1e293b', 
                marginBottom: '0.75rem',
                display: 'block',
                fontSize: '0.9rem',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
                  <rect x="3" y="6" width="18" height="15" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Select Date
              </label>
              <DatePicker
                selected={exportDate}
                onChange={date => setExportDate(date)}
                maxDate={new Date()}
                dateFormat="yyyy-MM-dd"
                placeholderText="Choose a date..."
                className="form-control"
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(42, 63, 157, 0.2)',
                  padding: '0.75rem 1rem'
                }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer style={{ 
            padding: '1.5rem 2rem',
            borderTop: '1px solid rgba(42, 63, 157, 0.1)',
            gap: '0.75rem'
          }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowExportModal(false)}
              style={{
                borderRadius: '12px',
                fontWeight: 700,
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                border: 'none',
                color: '#374151',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={!exportDate || exporting}
              style={{
                borderRadius: '12px',
                fontWeight: 700,
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(42, 63, 157, 0.3)',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
              }}
            >
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
};

export default AttendancePage;