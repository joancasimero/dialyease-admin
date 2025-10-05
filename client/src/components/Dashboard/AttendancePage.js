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
      padding: '2.5rem 1rem 2rem 1rem',
      marginLeft: 0,
      width: '100%',
    },
    header: {
      color: '#2a3f9d',
      fontWeight: 800,
      fontSize: '1.8rem',
      marginBottom: '1.5rem',
      letterSpacing: '-1px',
      textShadow: '0 2px 12px rgba(42,63,157,0.08)',
      background: 'linear-gradient(90deg, #2a3f9d 60%, #4a6cf7 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      display: 'inline-block'
    },
    card: {
      border: 'none',
      borderRadius: '18px',
      background: 'linear-gradient(135deg, #f8fafc 70%, #e0e7ff 100%)',
      boxShadow: '0 8px 30px rgba(42, 63, 157, 0.10)',
      marginBottom: '2rem',
      overflow: 'hidden',
      padding: '1.5rem'
    },
    table: {
      borderRadius: '0',
      overflow: 'hidden',
      margin: '0',
      border: 'none',
      background: 'white'
    },
    tableHeader: {
      backgroundColor: '#f8fafc',
      color: '#2a3f9d',
      fontWeight: '600',
      borderBottom: '1px solid rgba(0,0,0,0.05)'
    },
    badge: {
      fontWeight: '500',
      padding: '0.4rem 0.6rem',
      borderRadius: '8px',
      fontSize: '0.8rem'
    },
    filterLabel: {
      fontWeight: 600,
      color: '#2a3f9d',
      fontSize: '0.9rem',
      marginRight: 8
    },
    refreshBtn: {
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '0.85rem',
      padding: '0.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: '#2a3f9d',
      border: 'none',
      color: '#fff',
      boxShadow: '0 2px 8px rgba(42, 63, 157, 0.10)'
    }
  };

  return (
    <div style={{ backgroundColor: '#f9fafc', minHeight: '100vh' }}>
      <style>
        {`
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
          
          /* Responsive sidebar handling */
          @media (min-width: 992px) {
            .attendance-container {
              margin-left: 240px !important;
              width: calc(100vw - 240px) !important;
              padding: 2.5rem 2rem 2rem 2rem !important;
            }
            .attendance-header {
              font-size: 2.1rem !important;
            }
            .attendance-card {
              padding: 2rem 2rem 1.5rem 2rem !important;
            }
            .attendance-badge {
              padding: 0.5rem 0.75rem !important;
              font-size: 0.85rem !important;
            }
            .attendance-filter-label {
              font-size: 1rem !important;
            }
            .attendance-refresh-btn {
              font-size: 0.97rem !important;
              padding: 0.5rem 1.2rem !important;
              gap: 8px !important;
            }
          }
          
          @media (max-width: 991px) {
            .table th, .table td {
              padding: 0.5rem 0.25rem !important;
              font-size: 0.85rem !important;
            }
          }
          
          @media (max-width: 576px) {
            .table th, .table td {
              padding: 0.4rem 0.2rem !important;
              font-size: 0.75rem !important;
            }
          }
        `}
      </style>
      
      <Container fluid className="attendance-container" style={styles.container}>
        <Row>
          <Col xs={12}>
            <div style={styles.header} className="attendance-header mb-3 mb-md-4">
              <FiUserX className="me-2" style={{ fontSize: 'clamp(24px, 4vw, 32px)' }} />
              Attendance Records
            </div>
          </Col>
        </Row>
        
        <Card style={styles.card} className="attendance-card">
          <Row className="g-2 g-md-3 mb-3">
            <Col xs={12} md={6} lg={4}>
              <div className="d-flex align-items-center gap-2">
                <span style={styles.filterLabel} className="attendance-filter-label d-flex align-items-center gap-1">
                  <FiCalendar /> Date:
                </span>
                <DatePicker
                  selected={selectedDate}
                  onChange={date => setSelectedDate(date)}
                  maxDate={new Date()}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select date"
                  className="form-control flex-grow-1"
                  isClearable
                />
              </div>
            </Col>
            <Col xs={12} md={6} lg={4}>
              <div className="d-flex align-items-center gap-2">
                <span style={styles.filterLabel} className="attendance-filter-label d-flex align-items-center gap-1">
                  <FiSearch /> Status:
                </span>
                <Form.Select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="flex-grow-1"
                >
                  <option value="all">All</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </Form.Select>
              </div>
            </Col>
            <Col xs={6} lg={2}>
              <Button 
                className="w-100 attendance-refresh-btn d-flex align-items-center justify-content-center gap-2" 
                style={styles.refreshBtn} 
                onClick={handleRefresh} 
                disabled={refreshing}
              >
                <FiRefreshCw className={refreshing ? 'spin' : ''} />
                <span className="d-none d-sm-inline">Refresh</span>
              </Button>
            </Col>
            <Col xs={6} lg={2}>
              <Button
                variant="secondary"
                className="w-100 attendance-refresh-btn d-flex align-items-center justify-content-center gap-2"
                style={{ ...styles.refreshBtn, background: '#64748b' }}
                onClick={() => setShowExportModal(true)}
              >
                <span className="d-none d-sm-inline">Export PDF</span>
                <span className="d-sm-none">PDF</span>
              </Button>
            </Col>
          </Row>
          
          {error && (
            <Alert variant="danger" style={{ borderRadius: 10, marginBottom: 16 }}>
              {error}
            </Alert>
          )}
          
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <Table hover responsive style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={{ textAlign: 'center', fontWeight: 700 }}>Patient Name</th>
                  <th style={{ textAlign: 'center', fontWeight: 700 }}>Date</th>
                  <th style={{ textAlign: 'center', fontWeight: 700 }}>Status</th>
                  <th style={{ textAlign: 'center', fontWeight: 700 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                      <div className="spinner-border" role="status" style={{ width: '2.5rem', height: '2.5rem', color: '#2a3f9d' }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <div style={{ color: '#6b7280', marginTop: 12 }}>Loading attendance records...</div>
                    </td>
                  </tr>
                ) : attendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', fontWeight: 500, padding: '2rem' }}>
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  attendance.map((rec, idx) => (
                    <tr key={rec._id || idx} style={{ background: rec.status === 'absent' ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.05)' }}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#2a3f9d', fontSize: '1.05rem' }}>
                        <FiUser style={{ marginRight: 7, color: '#4a6cf7', verticalAlign: 'middle' }} />
                        {rec.patient?.firstName} {rec.patient?.lastName}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500, color: '#374151' }}>
                        {rec.date}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {rec.status === 'present' ? (
                          <Badge bg="success" style={styles.badge} className="attendance-badge">
                            <FiCheckCircle style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            Present
                          </Badge>
                        ) : (
                          <Badge bg="danger" style={styles.badge} className="attendance-badge">
                            <FiUserX style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            Absent
                          </Badge>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500, color: '#374151' }}>
                        {rec.status === 'present' && rec.time ? rec.time : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      </Container>

      <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Export Attendance PDF</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {exportError && (
            <Alert variant="danger" style={{ borderRadius: 8, marginBottom: 12 }}>
              {exportError}
            </Alert>
          )}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 600, color: '#2a3f9d', marginRight: 8 }} className="d-flex align-items-center gap-1">
              <FiCalendar /> Select Date:
            </span>
            <DatePicker
              selected={exportDate}
              onChange={date => setExportDate(date)}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select date"
              className="form-control"
              style={{ borderRadius: 8, minWidth: 180 }}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExportPDF}
            disabled={!exportDate || exporting}
          >
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AttendancePage;