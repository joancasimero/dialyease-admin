import React, { useState, useEffect, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Card, Row, Col, Badge, Button, Alert, Spinner, Modal, Table } from 'react-bootstrap';
import { FiClock, FiCalendar } from 'react-icons/fi';
import api from '../../services/api';
import moment from 'moment-timezone'; // Add this import

// Helper to get Philippine date string using moment-timezone
function getPhilippineDateStr(dateObj) {
  // Use moment-timezone for consistent Asia/Manila date
  return moment(dateObj).tz('Asia/Manila').format('YYYY-MM-DD');
}

const AppointmentSlotTracker = ({ authToken }) => {
  // Reason dropdown for deny
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyRequestId, setDenyRequestId] = useState(null);
  const [denyReason, setDenyReason] = useState('');
  const denyReasons = [
    'No available slots',
    'Patient not eligible',
    'Schedule conflict',
    'Other'
  ];

  const [selectedDate, setSelectedDate] = useState(() => {
    // Get today's date in Philippine time using moment-timezone
    return moment().tz('Asia/Manila').toDate();
  });
  const [slotData, setSlotData] = useState(null);
  // Reschedule requests state
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduleSuccess, setRescheduleSuccess] = useState('');
  // Fetch reschedule requests (admin)
  const fetchRescheduleRequests = useCallback(async () => {
    setRescheduleLoading(true);
    setRescheduleError('');
    try {
      const resp = await api.get('/appointment-slots/reschedule-requests', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setRescheduleRequests(resp.data.requests || []);
    } catch (err) {
      setRescheduleError(err.response?.data?.message || 'Failed to fetch reschedule requests');
    } finally {
      setRescheduleLoading(false);
    }
  }, [authToken]);

  // Approve a reschedule request
  const handleApproveRequest = async (requestId) => {
    if (!window.confirm('Approve this reschedule request?')) return;
    setRescheduleSuccess('');
    setRescheduleError('');
    try {
      await api.post(`/appointment-slots/reschedule-requests/${requestId}/approve`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setRescheduleSuccess('Request approved and slot updated.');
      await fetchRescheduleRequests();
      await fetchSlotData(selectedDate);
    } catch (err) {
      setRescheduleError(err.response?.data?.message || 'Failed to approve request');
    }
  };

  // Deny a reschedule request
  const handleDenyRequest = (requestId) => {
    setDenyRequestId(requestId);
    setDenyReason(denyReasons[0]);
    setShowDenyModal(true);
  };

  const submitDenyRequest = async () => {
    if (!denyRequestId || !denyReason) return;
    setRescheduleSuccess('');
    setRescheduleError('');
    try {
      await api.post(`/appointment-slots/reschedule-requests/${denyRequestId}/deny`, { reason: denyReason }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setRescheduleSuccess('Request denied.');
      setShowDenyModal(false);
      setDenyRequestId(null);
      setDenyReason('');
      await fetchRescheduleRequests();
    } catch (err) {
      setRescheduleError(err.response?.data?.message || 'Failed to deny request');
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(null); // slotId being toggled
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);

  // Cancel a slot booking
  const handleCancelBooking = async (slot) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post(
        '/appointment-slots/cancel',
        { date: slot.date, patientId: slot.patient._id },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSuccess('Booking cancelled successfully.');
      await fetchSlotData(selectedDate);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelLoading(false);
    }
  };

  // Toggle disable/enable for a slot
  const handleToggleDisable = async (slot) => {
    setToggleLoading(slot._id);
    setError('');
    setSuccess('');
    try {
      await api.post(
        `/appointment-slots/${slot._id}/toggle-disable`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSuccess(`Slot #${slot.slotNumber} has been ${slot.isDisabled ? 'enabled' : 'disabled'} for booking.`);
      await fetchSlotData(selectedDate);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update slot status');
    } finally {
      setToggleLoading(null);
    }
  };

  const fetchSlotData = useCallback(async (dateObj) => {
    try {
      setLoading(true);
      const dateStr = getPhilippineDateStr(dateObj);
      const response = await api.get(`/appointment-slots/date/${dateStr}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      // If no slots exist, auto-initialize
      if (
        response.data &&
        Array.isArray(response.data.morning) &&
        Array.isArray(response.data.afternoon) &&
        response.data.morning.length === 0 &&
        response.data.afternoon.length === 0
      ) {
        await api.post('/appointment-slots/initialize-slots', 
          { date: dateStr },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        // Fetch again after initializing
        const response2 = await api.get(`/appointment-slots/date/${dateStr}`, {
          headers: { Authorization: `Bearer ${authToken}` } 
        });
        setSlotData(response2.data);
        setError('');
      } else {
        setSlotData(response.data);
        setError('');
      }
    } catch (err) {
      console.error('Error fetching slot data:', err);
      if (err.response?.status === 404) {
        setSlotData(null);
        setError('No slots initialized for this date. Click "Initialize Slots" to create them.');
      } else {
        setError('Failed to fetch slot data');
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const initializeSlots = async () => {
    try {
      setLoading(true);
      const dateStr = getPhilippineDateStr(selectedDate);
      await api.post('/appointment-slots/initialize-slots', 
        { date: dateStr },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setSuccess('Slots initialized successfully!');
      await fetchSlotData(selectedDate);
    } catch (err) {
      console.error('Error initializing slots:', err);
      setError(err.response?.data?.message || 'Failed to initialize slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      const dateStr = getPhilippineDateStr(selectedDate);
      fetchSlotData(selectedDate);
      fetchRescheduleRequests();
    }
  }, [selectedDate, authToken, fetchSlotData, fetchRescheduleRequests]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const getSlotStatusColor = (slot) => {
    if (slot.isDisabled) return 'dark';
    if (!slot.isBooked) return 'success';
    if (slot.status === 'completed') return 'secondary';
    if (slot.status === 'cancelled') return 'warning';
    return 'primary';
  };

  const getSlotStatusText = (slot) => {
    if (slot.isDisabled) return 'Disabled';
    if (!slot.isBooked) return 'Available';
    if (slot.status === 'completed') return 'Completed';
    if (slot.status === 'cancelled') return 'Cancelled';
    return 'Booked';
  };

  const showSlotDetails = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setShowDetailModal(true);
  };

  const styles = {
    card: {
      border: 'none',
      borderRadius: '18px',
      boxShadow: '0 8px 32px rgba(38, 58, 153, 0.10)',
      background: 'linear-gradient(135deg, #f5faff 70%, #e0e7ff 100%)',
      marginBottom: '2rem',
      padding: '2rem',
      fontFamily: "'Inter Tight', 'Inter', 'Segoe UI', sans-serif"
    },
    slotGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '1rem',
      padding: '0',
      background: 'transparent',
      borderRadius: '12px',
    },
    slotItem: {
      padding: '1.25rem 0.75rem',
      borderRadius: '16px',
      textAlign: 'center',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      border: '2px solid rgba(42, 63, 157, 0.15)',
      background: 'white',
      boxShadow: '0 4px 12px rgba(42, 63, 157, 0.08)',
      color: '#1e293b',
      position: 'relative',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
    },
    slotItemHover: {
      boxShadow: '0 4px 16px rgba(38, 58, 153, 0.10)',
      borderColor: '#263a99',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f5faff 100%)',
      color: '#1d2f7b',
    },
    slotStatus: {
      fontSize: '0.85rem',
      fontWeight: '500',
      marginTop: '0.5rem',
      color: '#6b7280',
    },
    statsCard: {
      background: 'linear-gradient(135deg, #f5faff 60%, #e0e7ff 100%)',
      borderRadius: '14px',
      padding: '1.5rem',
      textAlign: 'center',
      border: 'none',
      boxShadow: '0 4px 16px rgba(42, 63, 157, 0.08)',
      fontFamily: "'Inter Tight', 'Inter', 'Segoe UI', sans-serif"
    },
    controls: {
      display: 'flex',
      gap: '1.5rem',
      alignItems: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap',
    },
    datePicker: {
      borderRadius: '8px',
      border: '2px solid #e5e7eb',
      padding: '0.7rem 1rem',
      fontSize: '1rem',
      fontWeight: '500',
      background: '#fafafa',
      color: '#263a99',
      boxShadow: '0 2px 8px rgba(38, 58, 153, 0.04)',
      transition: 'border-color 0.3s',
    },
    modal: {
      borderRadius: '16px',
      padding: '2rem',
      background: 'white',
      boxShadow: '0 8px 32px rgba(38, 58, 153, 0.10)',
      fontFamily: "'Inter Tight', 'Inter', 'Segoe UI', sans-serif"
    },
    modalHeader: {
      fontWeight: '700',
      fontSize: '1.5rem',
      color: '#263a99',
      marginBottom: '1rem',
    },
    modalButton: {
      background: '#263a99',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '0.75rem 1.5rem',
      fontWeight: '600',
      fontSize: '1rem',
      boxShadow: '0 4px 14px 0 rgba(38, 58, 153, 0.15)',
      transition: 'background 0.3s, transform 0.2s',
    },
    modalButtonSecondary: {
      background: '#e5e7eb',
      color: '#263a99',
      border: 'none',
      borderRadius: '10px',
      padding: '0.75rem 1.5rem',
      fontWeight: '600',
      fontSize: '1rem',
      marginLeft: '1rem',
      boxShadow: '0 2px 8px rgba(38, 58, 153, 0.04)',
      transition: 'background 0.3s, transform 0.2s',
    },
    alert: {
      border: 'none',
      borderRadius: '10px',
      padding: '0.875rem 1rem',
      fontWeight: '500',
      fontSize: '0.95rem',
      marginTop: '1rem',
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      color: '#dc2626',
      borderLeft: '4px solid #ef4444',
      animation: 'slideIn 0.3s ease-out',
    },
    alertSuccess: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      color: '#059669',
      borderLeft: '4px solid #10b981',
    },
    alertWarning: {
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      color: '#d97706',
      borderLeft: '4px solid #f59e0b',
    },
  };

  return (
    <div>
      <Card style={styles.card}>
        {/* Reschedule Requests Section */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(42, 63, 157, 0.12), 0 8px 25px rgba(74, 108, 247, 0.08)',
          overflow: 'hidden',
          marginBottom: '2rem',
          marginTop: '1.5rem',
          border: '2px solid rgba(42, 63, 157, 0.15)',
          fontFamily: "'Inter Tight', 'Inter', 'Segoe UI', sans-serif"
        }}>
          <div style={{ padding: '2rem 2.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              paddingBottom: '1.5rem',
              borderBottom: '2px solid rgba(42, 63, 157, 0.15)'
            }}>
              <div>
                <h5 style={{
                  color: '#1e293b',
                  fontWeight: 800,
                  margin: 0,
                  fontSize: '1.4rem',
                  letterSpacing: '-0.025em',
                  fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                }}>
                  Reschedule Requests
                </h5>
                <p style={{
                  color: '#64748b',
                  margin: 0,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  marginTop: '0.25rem'
                }}>
                  Manage patient appointment changes
                </p>
              </div>
              <Button 
                onClick={fetchRescheduleRequests} 
                disabled={rescheduleLoading}
                style={{
                  background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
                  borderColor: 'transparent',
                  color: 'white',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '0.75rem 1.5rem',
                  fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(42, 63, 157, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                {rescheduleLoading ? '⟳ Refreshing...' : '🔄 Refresh'}
              </Button>
            </div>
            {rescheduleError && (
              <div style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
              }}>
                ❌ {rescheduleError}
              </div>
            )}
            {rescheduleSuccess && (
              <div style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: 'white',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
              }}>
                ✅ {rescheduleSuccess}
              </div>
            )}
            {rescheduleLoading ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                color: '#64748b'
              }}>
                <Spinner animation="border" style={{ color: '#2a3f9d', marginBottom: '1rem' }} />
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                }}>
                  Loading requests...
                </div>
              </div>
            ) : rescheduleRequests.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                color: '#64748b',
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
              }}>
                📅 No pending reschedule requests at this time.
              </div>
            ) : (
              <Table responsive hover style={{ 
                background: 'transparent', 
                margin: 0,
                fontSize: '0.9rem',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                color: '#1e293b'
              }}>
                <thead style={{ 
                  background: 'linear-gradient(135deg, rgba(42, 63, 157, 0.08) 0%, rgba(74, 108, 247, 0.08) 100%)', 
                  borderBottom: '2px solid rgba(42, 63, 157, 0.2)'
                }}>
                  <tr>
                    <th style={{
                      color: '#374151',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      letterSpacing: '0.025em',
                      textTransform: 'uppercase',
                      padding: '1.25rem 1.5rem',
                      borderBottom: 'none',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                    }}>Patient</th>
                    <th style={{
                      color: '#374151',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      letterSpacing: '0.025em',
                      textTransform: 'uppercase',
                      padding: '1.25rem 1.5rem',
                      borderBottom: 'none',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                    }}>Current Date</th>
                    <th style={{
                      color: '#374151',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      letterSpacing: '0.025em',
                      textTransform: 'uppercase',
                      padding: '1.25rem 1.5rem',
                      borderBottom: 'none',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                    }}>Requested Date</th>
                    <th style={{
                      color: '#374151',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      letterSpacing: '0.025em',
                      textTransform: 'uppercase',
                      padding: '1.25rem 1.5rem',
                      borderBottom: 'none',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                    }}>Submitted</th>
                    <th style={{
                      color: '#374151',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      letterSpacing: '0.025em',
                      textTransform: 'uppercase',
                      padding: '1.25rem 1.5rem',
                      borderBottom: 'none',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                    }}>Status</th>
                    <th style={{
                      color: '#374151',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      letterSpacing: '0.025em',
                      textTransform: 'uppercase',
                      padding: '1.25rem 1.5rem',
                      borderBottom: 'none',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rescheduleRequests.map((req) => {
                    const patient = req.patient || {};
                    // Show only originalScheduledDate from the request model
                    const originalScheduleDate = req.originalScheduledDate
                      ? moment(req.originalScheduledDate).format('YYYY-MM-DD')
                      : 'N/A';
                    // Requested at: createdAt
                    const requestedAt = req.createdAt
                      ? moment(req.createdAt).tz('Asia/Manila').format('YYYY-MM-DD HH:mm')
                      : 'N/A';
                    return (
                      <tr key={req._id} style={{
                        borderBottom: '1px solid rgba(42, 63, 157, 0.1)',
                        transition: 'background-color 0.2s ease'
                      }}>
                        <td style={{
                          fontWeight: 700,
                          color: '#1e293b',
                          padding: '1.25rem 1.5rem',
                          borderBottom: 'none',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                          fontSize: '0.9rem'
                        }}>
                          <div>{patient.firstName} {patient.lastName}</div>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#64748b',
                            fontWeight: 500,
                            marginTop: '0.25rem'
                          }}>
                            PID: {patient.pidNumber || 'Not Set'}
                          </div>
                        </td>
                        <td style={{
                          padding: '1.25rem 1.5rem',
                          borderBottom: 'none',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}>{originalScheduleDate}</td>
                        <td style={{
                          padding: '1.25rem 1.5rem',
                          borderBottom: 'none',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#374151'
                        }}>{req.requestedDate}</td>
                        <td style={{
                          padding: '1.25rem 1.5rem',
                          borderBottom: 'none',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#64748b'
                        }}>{requestedAt}</td>
                        <td style={{
                          padding: '1.25rem 1.5rem',
                          borderBottom: 'none'
                        }}>
                          <Badge style={{
                            backgroundColor: req.status === 'pending' ? '#2a3f9d' : (req.status === 'approved' ? '#10b981' : '#ef4444'),
                            color: 'white',
                            fontSize: '0.8rem',
                            padding: '0.4em 0.8em',
                            borderRadius: '12px',
                            fontWeight: 600,
                            border: 'none',
                            textTransform: 'capitalize',
                            fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                          }}>
                            {req.status === 'pending' ? '⏳ Pending' : 
                             req.status === 'approved' ? '✅ Approved' : 
                             '❌ Denied'}
                          </Badge>
                        </td>
                        <td style={{
                          padding: '1.25rem 1.5rem',
                          borderBottom: 'none'
                        }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {req.status === 'pending' && (
                              <>
                                <Button 
                                  onClick={() => handleApproveRequest(req._id)}
                                  style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    borderColor: 'transparent',
                                    color: 'white',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    padding: '0.5rem 1rem',
                                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                                    border: 'none',
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                  }}
                                >
                                  ✓ Approve
                                </Button>
                                <Button 
                                  onClick={() => handleDenyRequest(req._id)}
                                  style={{
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    borderColor: 'transparent',
                                    color: 'white',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    padding: '0.5rem 1rem',
                                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                                    border: 'none',
                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                                  }}
                                >
                                  ✗ Deny
                                </Button>
                              </>
                            )}
                            {req.status !== 'pending' && (
                              <span style={{
                                color: '#9ca3af',
                                fontSize: '0.85rem',
                                fontStyle: 'italic',
                                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                              }}>
                                Request {req.status}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        </div>

        <Card.Body style={{ padding: '2rem 2.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '2px solid rgba(42, 63, 157, 0.1)'
          }}>
            <div>
              <h5 style={{
                color: '#1e293b',
                fontWeight: 800,
                margin: 0,
                fontSize: '1.6rem',
                letterSpacing: '-0.025em',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
              }}>
                Appointment Slot Tracker
              </h5>
              <p style={{
                color: '#64748b',
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: 500,
                marginTop: '0.5rem',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
              }}>
                Real-time slot availability and booking management
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '0.95rem',
                  letterSpacing: '-0.025em',
                  fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                }}>
                  Date:
                </span>
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  dateFormat="yyyy-MM-dd"
                  className="form-control"
                  popperPlacement="bottom"
                  calendarClassName="custom-datepicker-calendar"
                  wrapperClassName="custom-datepicker-wrapper"
                  style={{
                    width: 'auto',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    boxShadow: '0 2px 8px rgba(42, 63, 157, 0.1)',
                    border: '2px solid rgba(42, 63, 157, 0.2)',
                    background: 'white',
                    color: '#2a3f9d',
                    padding: '0.6rem 1rem',
                    minWidth: '150px',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}
                />
              </div>
              {!slotData && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={initializeSlots}
                  disabled={loading}
                  style={{
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
                    border: 'none',
                    fontWeight: 700,
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(42, 63, 157, 0.25)',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}
                >
                  Initialize Slots
                </Button>
              )}
            </div>
          </div>

          {/* Deny Reason Modal */}
          <Modal show={showDenyModal} onHide={() => setShowDenyModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Deny Reschedule Request</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-3">
                <label htmlFor="denyReason" style={{ fontWeight: 500 }}>Select Reason:</label>
                <select
                  id="denyReason"
                  className="form-control"
                  value={denyReason}
                  onChange={e => setDenyReason(e.target.value)}
                >
                  {denyReasons.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDenyModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={submitDenyRequest}>Submit</Button>
            </Modal.Footer>
          </Modal>

          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {success && <Alert variant="success" className="mb-3">{success}</Alert>}

          {loading && (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 mb-0">Loading slot data...</p>
            </div>
          )}

          {!slotData && !loading && (
            <div className="text-center py-4">
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                No slots initialized for this date. Click "Initialize Slots" to create them.
              </p>
            </div>
          )}

          {slotData && (
            <>
              {/* Statistics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  border: '2px solid rgba(42, 63, 157, 0.1)',
                  boxShadow: '0 4px 16px rgba(42, 63, 157, 0.08)',
                  fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(42, 63, 157, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(42, 63, 157, 0.08)';
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 0.75rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(42, 63, 157, 0.1) 0%, rgba(74, 108, 247, 0.15) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="4" y="4" width="16" height="16" rx="2" stroke="#2a3f9d" strokeWidth="2"/>
                      <path d="M8 2v4M16 2v4M4 10h16" stroke="#2a3f9d" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ color: '#2a3f9d', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.25rem' }}>
                    {slotData.totalSlots}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.025em' }}>Total Slots</div>
                </div>
                
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  border: '2px solid rgba(16, 185, 129, 0.2)',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.12)',
                  fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.12)';
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 0.75rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.15) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="2"/>
                      <path d="M9 12l2 2l4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ color: '#059669', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.25rem' }}>
                    {slotData.availableSlots}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.025em' }}>Available</div>
                </div>
                
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  border: '2px solid rgba(220, 38, 38, 0.2)',
                  boxShadow: '0 4px 16px rgba(220, 38, 38, 0.12)',
                  fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(220, 38, 38, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(220, 38, 38, 0.12)';
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 0.75rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.15) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="9" stroke="#dc2626" strokeWidth="2"/>
                      <path d="M15 9l-6 6M9 9l6 6" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ color: '#dc2626', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.25rem' }}>
                    {slotData.bookedSlots}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.025em' }}>Booked</div>
                </div>
                
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  border: '2px solid rgba(124, 58, 237, 0.2)',
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.12)',
                  fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 58, 237, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 58, 237, 0.12)';
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    margin: '0 auto 0.75rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(109, 40, 217, 0.15) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 2L3 14h9l-1 8l10-12h-9l1-8z" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ color: '#7c3aed', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.25rem' }}>
                    {Math.round((slotData.bookedSlots / slotData.totalSlots) * 100)}%
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.025em' }}>Utilization</div>
                </div>
              </div>

              {/* Morning Slots */}
              <div className="mb-4">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid rgba(42, 63, 157, 0.1)'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(42, 63, 157, 0.1) 0%, rgba(74, 108, 247, 0.15) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="9" stroke="#2a3f9d" strokeWidth="2"/>
                      <path d="M12 6v6l4 2" stroke="#2a3f9d" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h6 style={{
                    color: '#1e293b',
                    fontWeight: 700,
                    margin: 0,
                    fontSize: '1.15rem',
                    letterSpacing: '-0.025em',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>
                    Morning Slots
                  </h6>
                </div>
                {slotData && slotData.morning ? (
                  <div style={styles.slotGrid}>
                    {slotData.morning.map((slot) => (
                      <div
                        key={`morning-${slot.slotNumber}`}
                        style={{
                          ...styles.slotItem,
                          backgroundColor: slot.isDisabled ? '#e5e7eb' : (slot.isBooked ? '#fef3c7' : '#d1fae5'),
                          borderColor: slot.isDisabled ? '#6b7280' : (slot.isBooked ? '#f59e0b' : '#10b981'),
                          opacity: slot.isDisabled ? 0.6 : 1,
                          cursor: 'pointer'
                        }}
                        title={slot.isDisabled ? 'Disabled for booking' : (slot.isBooked ? `Booked by ${slot.patient?.firstName} ${slot.patient?.lastName}` : 'Available')}
                        onClick={() => { setActiveSlot(slot); setShowSlotModal(true); }}
                      >
                        <div style={{ fontWeight: 600 }}>{slot.slotNumber}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          {slot.machine?.name || 'Machine N/A'}
                        </div>
                        <Badge 
                          bg={getSlotStatusColor(slot)} 
                          style={{ fontSize: '0.7rem', marginTop: '2px' }}
                        >
                          {getSlotStatusText(slot)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Afternoon Slots */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid rgba(42, 63, 157, 0.1)'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(42, 63, 157, 0.1) 0%, rgba(74, 108, 247, 0.15) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="9" stroke="#2a3f9d" strokeWidth="2"/>
                      <path d="M12 6v6l4 2" stroke="#2a3f9d" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h6 style={{
                    color: '#1e293b',
                    fontWeight: 700,
                    margin: 0,
                    fontSize: '1.15rem',
                    letterSpacing: '-0.025em',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>
                    Afternoon Slots
                  </h6>
                </div>
                {slotData && slotData.afternoon ? (
                  <div style={styles.slotGrid}>
                    {slotData.afternoon.map((slot) => (
                      <div
                        key={`afternoon-${slot.slotNumber}`}
                        style={{
                          ...styles.slotItem,
                          backgroundColor: slot.isDisabled ? '#e5e7eb' : (slot.isBooked ? '#fef3c7' : '#d1fae5'),
                          borderColor: slot.isDisabled ? '#6b7280' : (slot.isBooked ? '#f59e0b' : '#10b981'),
                          opacity: slot.isDisabled ? 0.6 : 1,
                          cursor: 'pointer'
                        }}
                        title={slot.isDisabled ? 'Disabled for booking' : (slot.isBooked ? `Booked by ${slot.patient?.firstName} ${slot.patient?.lastName}` : 'Available')}
                        onClick={() => { setActiveSlot(slot); setShowSlotModal(true); }}
                      >
                        <div style={{ fontWeight: 600 }}>{slot.slotNumber}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          {slot.machine?.name || 'Machine N/A'}
                        </div>
                        <Badge 
                          bg={getSlotStatusColor(slot)} 
                          style={{ fontSize: '0.7rem', marginTop: '2px' }}
                        >
                          {getSlotStatusText(slot)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Detailed View Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedTimeSlot.charAt(0).toUpperCase() + selectedTimeSlot.slice(1)} Slots - {selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : selectedDate}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {slotData && (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Slot #</th>
                  <th>Machine</th>
                  <th>Status</th>
                  <th>Patient</th>
                  <th>Booked At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {slotData[selectedTimeSlot]?.map((slot) => (
                  <tr key={slot.slotNumber} style={slot.isDisabled ? { backgroundColor: '#f3f4f6', opacity: 0.7 } : {}}>
                    <td style={{ fontWeight: 600 }}>{slot.slotNumber}</td>
                    <td>{slot.machine?.name || 'N/A'}</td>
                    <td>
                      <Badge bg={getSlotStatusColor(slot)}>
                        {getSlotStatusText(slot)}
                      </Badge>
                    </td>
                    <td>
                      {slot.patient ? 
                        `${slot.patient.firstName} ${slot.patient.lastName} (${slot.patient.pidNumber || 'No PID'})` : 
                        '-'
                      }
                    </td>
                    <td>
                      {slot.bookedAt ? 
                        new Date(slot.bookedAt).toLocaleString() : 
                        '-'
                      }
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <Button
                        variant={slot.isDisabled ? 'success' : 'secondary'}
                        size="sm"
                        disabled={toggleLoading === slot._id}
                        onClick={() => handleToggleDisable(slot)}
                        style={{ borderRadius: '6px' }}
                      >
                        {toggleLoading === slot._id
                          ? (slot.isDisabled ? 'Enabling...' : 'Disabling...')
                          : (slot.isDisabled ? 'Enable' : 'Disable')}
                      </Button>
                      {slot.isBooked && slot.patient ? (
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={cancelLoading || slot.isDisabled}
                          onClick={() => handleCancelBooking(slot)}
                          style={{ borderRadius: '6px' }}
                        >
                          {cancelLoading ? 'Cancelling...' : 'Cancel Booking'}
                        </Button>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>

      {/* Slot Details Modal */}
      <Modal 
        show={showSlotModal} 
        onHide={() => setShowSlotModal(false)} 
        centered
        dialogClassName="custom-modal-dialog"
      >
        <div style={{
          borderRadius: '20px',
          overflow: 'hidden',
          border: 'none',
          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
          boxShadow: '0 20px 60px rgba(42, 63, 157, 0.25)',
          background: 'white'
        }}>
          <Modal.Header 
            closeButton
            className="border-0"
            style={{
              background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
              border: 'none',
              padding: '1.75rem 2rem',
              color: 'white',
              borderRadius: 0
            }}
          >
            <Modal.Title style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.025em',
              fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
            }}>
              Slot #{activeSlot?.slotNumber} - {activeSlot?.machine?.name || 'Machine N/A'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body 
            className="border-0"
            style={{
              padding: '2rem',
              background: 'white',
              borderRadius: 0
            }}
          >
            <div style={{
              display: 'grid',
              gap: '1.25rem',
              fontSize: '0.95rem',
              fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
            }}>
              {/* Status */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(42, 63, 157, 0.1)'
              }}>
                <span style={{
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '0.9rem',
                  letterSpacing: '0.025em',
                  textTransform: 'uppercase'
                }}>Status:</span>
                <Badge 
                  bg={getSlotStatusColor(activeSlot || {})}
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}
                >
                  {getSlotStatusText(activeSlot || {})}
                </Badge>
              </div>

              {/* Time Period */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                background: 'white',
                borderRadius: '12px',
                border: '2px solid rgba(42, 63, 157, 0.1)'
              }}>
                <span style={{
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '0.9rem',
                  letterSpacing: '0.025em',
                  textTransform: 'uppercase'
                }}>Time Period:</span>
                <span style={{
                  fontWeight: 600,
                  color: '#2a3f9d',
                  fontSize: '0.95rem'
                }}>
                  {slotData && slotData.morning && slotData.morning.includes(activeSlot) ? 'Morning' : (slotData && slotData.afternoon && slotData.afternoon.includes(activeSlot) ? 'Afternoon' : '-')}
                </span>
              </div>

              {/* Patient Info */}
              {activeSlot?.patient && (
                <div style={{
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  <div style={{
                    fontWeight: 700,
                    color: '#92400e',
                    fontSize: '0.85rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '0.75rem'
                  }}>Patient Information</div>
                  <div style={{
                    fontWeight: 700,
                    color: '#1e293b',
                    fontSize: '1.1rem',
                    marginBottom: '0.25rem'
                  }}>
                    {activeSlot.patient.firstName} {activeSlot.patient.lastName}
                  </div>
                  <div style={{
                    fontWeight: 500,
                    color: '#64748b',
                    fontSize: '0.85rem'
                  }}>
                    PID: {activeSlot.patient.pidNumber || 'Not Set'}
                  </div>
                </div>
              )}

              {/* Booked At */}
              {activeSlot?.bookedAt && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  background: 'white',
                  borderRadius: '12px',
                  border: '2px solid rgba(42, 63, 157, 0.1)'
                }}>
                  <span style={{
                    fontWeight: 700,
                    color: '#1e293b',
                    fontSize: '0.9rem',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase'
                  }}>Booked At:</span>
                  <span style={{
                    fontWeight: 600,
                    color: '#64748b',
                    fontSize: '0.9rem'
                  }}>
                    {new Date(activeSlot.bookedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              marginTop: '2rem',
              display: 'flex',
              gap: '0.75rem',
              paddingTop: '1.5rem',
              borderTop: '2px solid rgba(42, 63, 157, 0.1)'
            }}>
              <Button
                variant={activeSlot?.isDisabled ? 'success' : 'secondary'}
                size="lg"
                disabled={toggleLoading === activeSlot?._id}
                onClick={() => handleToggleDisable(activeSlot)}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: activeSlot?.isDisabled 
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                  transition: 'all 0.2s ease'
                }}
              >
                {toggleLoading === activeSlot?._id
                  ? (activeSlot?.isDisabled ? 'Enabling...' : 'Disabling...')
                  : (activeSlot?.isDisabled ? '✓ Enable Slot' : '⊗ Disable Slot')}
              </Button>
              {activeSlot?.isBooked && activeSlot?.patient && (
                <Button
                  variant="danger"
                  size="lg"
                  disabled={cancelLoading || activeSlot?.isDisabled}
                  onClick={() => handleCancelBooking(activeSlot)}
                  style={{
                    flex: 1,
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cancelLoading ? 'Cancelling...' : '✗ Cancel Booking'}
                </Button>
              )}
            </div>
          </Modal.Body>
        </div>
      </Modal>
    </div>
  );
};

function getNextDialysisDate(schedule, timeSlot) {
  const scheduledWeekdays = schedule === 'MWF'
    ? [1, 3, 5] // Mon, Wed, Fri
    : [2, 4, 6]; // Tue, Thu, Sat

  const now = new Date();
  now.setHours(now.getHours() + 8); // Adjust for timezone if needed

  for (let add = 0; add < 7; add++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + add);
    if (scheduledWeekdays.includes(candidate.getDay())) {
      const hour = timeSlot === 'afternoon' ? 12 : 6;
      candidate.setHours(hour, 0, 0, 0);
      return candidate;
    }
  }
  return null;
}

export default AppointmentSlotTracker;