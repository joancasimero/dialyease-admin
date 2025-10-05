import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Alert, Table, Badge, Spinner, Button, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import api from '../../services/api';
import { FiCalendar, FiUser, FiClock, FiSettings, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import moment from 'moment-timezone';



const Dashboard = () => {
  const [admin, setAdmin] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [machines, setMachines] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [todayBookedAppointments, setTodayBookedAppointments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [showCancelCheckInModal, setShowCancelCheckInModal] = useState(false);
  const [cancelPatientId, setCancelPatientId] = useState(null);
  const [cancelPatientName, setCancelPatientName] = useState('');
  const [cancelAttendanceId, setCancelAttendanceId] = useState(null);

  const navigate = useNavigate();
  const INACTIVITY_LIMIT = 30 * 60 * 1000;
  
  const getAuthHeader = () => {
    const admin = JSON.parse(localStorage.getItem('admin'));
    const token = admin?.token;
    return { Authorization: `Bearer ${token}` };
  };



  const fetchMachines = useCallback(async () => {
    try {
      const response = await api.get('/machines', {
        headers: getAuthHeader()
      });
      
      if (response.data && response.data.length > 0) {
        setMachines(response.data.map(machine => machine.name));
      }
    } catch (err) {
      console.error('Error fetching machines:', err);
    }
  }, []);

  const getPhilippineDate = () => {
    return moment().tz('Asia/Manila');
  };

  const fetchTodayAppointments = useCallback(async () => {
  try {
    console.log('Fetching today\'s appointments...'); // Debug log
    
    const response = await api.get('/patients/today-appointments', {
      headers: getAuthHeader()
    });

    console.log('Response:', response.data); // Debug log

    if (response.data.success) {
      setTodayAppointments(response.data.appointments);
      console.log('Today\'s appointments loaded:', response.data.appointments.length);
    } else {
      setTodayAppointments([]);
      console.log('No appointments found for today');
    }
  } catch (err) {
    console.error('Error fetching appointments:', err);
    console.error('Error details:', err.response?.data); // More detailed error logging
    setError("Failed to load today's appointments");
    setTodayAppointments([]);
  }
}, []);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get('/patients', {
        headers: getAuthHeader()
      });
      setPatients(Array.isArray(res.data) ? res.data : res.data.data);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to load patient information');
    }
  }, []);

  const fetchTodayBookedAppointments = useCallback(async () => {
  try {
    const todayStr = getPhilippineDateStr();
    const response = await api.get(`/appointment-slots/date/${todayStr}`, {
      headers: getAuthHeader()
    });
    
    // Get all booked slots for today
    const booked = [
      ...(response.data.morning || []),
      ...(response.data.afternoon || [])
    ].filter(slot => slot.isBooked && slot.date === todayStr);
    
    setTodayBookedAppointments(booked);
  } catch (err) {
    console.error('Error fetching today\'s booked appointments:', err);
    setError("Failed to load today's confirmed appointments");
  }
}, []);

  const fetchTodayAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const todayStr = getPhilippineDateStr();
      const res = await api.get('/attendance', {
        headers: getAuthHeader(),
        params: { date: todayStr }
      });
      setAttendanceRecords(res.data);
    } catch (err) {
      setAttendanceRecords([]);
    }
    setAttendanceLoading(false);
  }, []);

  useEffect(() => {
    const currentAdmin = authService.getCurrentAdmin();
    setAdmin(currentAdmin);

    fetchTodayAppointments();
    fetchPatients();
    fetchMachines();
    fetchTodayBookedAppointments();
    fetchTodayAttendance();

    let timeout;

    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        handleLogout();
      }, INACTIVITY_LIMIT);
    };

    const handleLogout = () => {
      authService.logout();
      navigate('/login');
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [navigate, INACTIVITY_LIMIT, fetchTodayAppointments, fetchPatients, fetchMachines, fetchTodayBookedAppointments, fetchTodayAttendance]);

  const getAppointmentCounts = () => {
    const morning = todayBookedAppointments.filter(a => a.timeSlot === 'morning').length;
    const afternoon = todayBookedAppointments.filter(a => a.timeSlot === 'afternoon').length;
    return { morning, afternoon };
  };

  // Get overall patient counts by time slot and schedule
  const getOverallPatientCounts = () => {
    const morningMWF = patients.filter(p => 
      p.assignedTimeSlot === 'morning' && 
      p.dialysisSchedule === 'MWF' && 
      !p.archived
    ).length;
    
    const morningTTHS = patients.filter(p => 
      p.assignedTimeSlot === 'morning' && 
      p.dialysisSchedule === 'TTHS' && 
      !p.archived
    ).length;
    
    const afternoonMWF = patients.filter(p => 
      p.assignedTimeSlot === 'afternoon' && 
      p.dialysisSchedule === 'MWF' && 
      !p.archived
    ).length;
    
    const afternoonTTHS = patients.filter(p => 
      p.assignedTimeSlot === 'afternoon' && 
      p.dialysisSchedule === 'TTHS' && 
      !p.archived
    ).length;

    return {
      morning: {
        total: morningMWF + morningTTHS,
        MWF: morningMWF,
        TTHS: morningTTHS
      },
      afternoon: {
        total: afternoonMWF + afternoonTTHS,
        MWF: afternoonMWF,
        TTHS: afternoonTTHS
      }
    };
  };

  // Get recommendations for new patient assignments
  const getAssignmentRecommendations = () => {
    const counts = overallPatientCounts;
    const recommendations = [];
    
    // Find the least loaded time slots
    const timeSlots = [
      { name: 'Morning MWF', count: counts.morning.MWF, schedule: 'MWF', timeSlot: 'morning' },
      { name: 'Morning TTHS', count: counts.morning.TTHS, schedule: 'TTHS', timeSlot: 'morning' },
      { name: 'Afternoon MWF', count: counts.afternoon.MWF, schedule: 'MWF', timeSlot: 'afternoon' },
      { name: 'Afternoon TTHS', count: counts.afternoon.TTHS, schedule: 'TTHS', timeSlot: 'afternoon' }
    ];
    
    // Sort by patient count (ascending)
    timeSlots.sort((a, b) => a.count - b.count);
    
    // Get available slots for each time period
    timeSlots.forEach(slot => {
      const availableSlots = 15 - slot.count;
      if (availableSlots > 0) {
        recommendations.push({
          ...slot,
          availableSlots,
          recommendation: availableSlots >= 5 ? 'Highly Recommended' : 
                          availableSlots >= 3 ? 'Recommended' : 'Limited Availability'
        });
      }
    });
    
    return recommendations;
  };

  const appointmentCounts = getAppointmentCounts();
  const overallPatientCounts = getOverallPatientCounts();
  const assignmentRecommendations = getAssignmentRecommendations();

  const styles = {
    container: {
      maxWidth: '1400px',
      padding: '2rem',
    },
    header: {
      color: '#2a3f9d',
      fontWeight: '700',
      marginBottom: '1.5rem',
      fontSize: '2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    welcomeCard: {
      border: 'none',
      borderRadius: '20px',
      background: '#263a99',
      color: 'white',
      boxShadow: '0 15px 40px rgba(38, 58, 153, 0.25), 0 5px 15px rgba(0, 0, 0, 0.1)',
      marginBottom: '2rem',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
    },
    welcomeCardBody: {
      padding: '2.5rem 2rem',
      position: 'relative',
      zIndex: 1,
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
    },
    welcomeTitle: {
      fontWeight: '800',
      fontSize: '2.1rem',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      lineHeight: '1.2',
      letterSpacing: '-0.025em',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
      color: 'white',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    welcomeText: {
      fontSize: '1.05rem',
      color: 'rgba(255, 255, 255, 0.9)',
      maxWidth: '600px',
      lineHeight: '1.4',
      fontWeight: '500',
      letterSpacing: '0.025em',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      marginBottom: '0',
    },
    card: {
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
      overflow: 'hidden',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    },
    cardHover: {
      transform: 'translateY(-5px)',
      boxShadow: '0 12px 35px rgba(0, 0, 0, 0.1)'
    },
    cardHeader: {
      backgroundColor: '#ffffff',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      padding: '1.5rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    cardBody: {
      padding: '0',
      backgroundColor: '#ffffff'
    },
    cardFooter: {
      backgroundColor: '#f9fafc',
      padding: '1.25rem 2rem',
      borderTop: '1px solid rgba(0,0,0,0.05)'
    },
    tabs: {
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      padding: '0 2rem',
      marginBottom: '0'
    },
    tab: {
      color: '#6b7280',
      fontWeight: '500',
      padding: '1rem 1.5rem',
      border: 'none',
    },
    activeTab: {
      color: '#2a3f9d',
      fontWeight: '600',
      borderBottom: '3px solid #2a3f9d'
    },
    badge: {
      fontWeight: '500',
      padding: '0.5rem 0.75rem',
      borderRadius: '8px',
      fontSize: '0.85rem'
    },
    table: {
      borderRadius: '0',
      overflow: 'hidden',
      margin: '0',
      border: 'none'
    },
    tableHeader: {
      backgroundColor: '#f8fafc',
      color: '#2a3f9d',
      fontWeight: '600',
      borderBottom: '1px solid rgba(0,0,0,0.05)'
    },
    tableRow: {
      transition: 'background-color 0.2s ease',
    },
    tableRowHover: {
      backgroundColor: 'rgba(42, 63, 157, 0.03)'
    },
    actionButton: {
      borderRadius: '8px',
      padding: '0.5rem 1rem',
      fontWeight: '500',
      fontSize: '0.85rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'all 0.2s ease'
    },
    primaryButton: {
      backgroundColor: '#2a3f9d',
      borderColor: '#2a3f9d',
      boxShadow: '0 2px 5px rgba(42, 63, 157, 0.2)',
    },
    primaryButtonHover: {
      backgroundColor: '#1e32a0',
      borderColor: '#1e32a0',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(42, 63, 157, 0.3)'
    },
    outlineButton: {
      color: '#2a3f9d',
      borderColor: '#2a3f9d',
    },
    outlineButtonHover: {
      backgroundColor: 'rgba(42, 63, 157, 0.05)',
      color: '#1e32a0',
      borderColor: '#1e32a0'
    },
    alert: {
      borderRadius: '12px',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      border: 'none',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    modalHeader: {
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      padding: '1.5rem',
      position: 'relative'
    },
    modalBody: {
      padding: '2rem'
    },
    modalFooter: {
      borderTop: '1px solid rgba(0,0,0,0.05)',
      padding: '1.5rem',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '1rem'
    },
    loadingSpinner: {
      color: '#2a3f9d',
      textAlign: 'center',
      padding: '3rem 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem'
    },
    infoAlert: {
      backgroundColor: '#f0f7ff',
      color: '#1a56db',
      border: 'none',
      margin: '2rem'
    },
    statsCard: {
      background: 'linear-gradient(135deg, #f8fafc 60%, #e0e7ff 100%)',
      borderRadius: '14px', 
      padding: '1.2rem 1rem', 
      boxShadow: '0 4px 16px rgba(42, 63, 157, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem', 
      minHeight: 90, 
      border: 'none',
      transition: 'box-shadow 0.2s',
    },
    statsValue: {
      fontSize: '1.4rem', 
      fontWeight: '700', 
      color: '#2a3f9d',
      letterSpacing: '-1px',
      marginBottom: 0,
    },
    statsLabel: {
      color: '#6b7280',
      fontSize: '0.92rem', 
      fontWeight: 500,
      marginTop: '-0.3rem', 
      letterSpacing: '0.5px',
    },
    iconWrapper: {
      width: '38px',
      height: '38px', 
      borderRadius: '10px', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
      color: '#2a3f9d',
      marginBottom: '0.3rem', 
      boxShadow: '0 1px 4px rgba(42, 63, 157, 0.06)', 
    },
    analyticsCard: {
      background: 'linear-gradient(135deg, #f8fafc 60%, #e0e7ff 100%)',
      borderRadius: '14px', 
      boxShadow: '0 4px 16px rgba(42, 63, 157, 0.06)', 
      padding: '1.2rem 1rem', 
      marginBottom: '1.2rem',
      border: 'none',
    },
    analyticsHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.7rem', 
      marginBottom: '1rem', 
      flexWrap: 'wrap',
    },
    analyticsTitle: {
      margin: 0,
      color: '#2a3f9d',
      fontWeight: 700,
      fontSize: '1.05rem',
      letterSpacing: '-0.5px',
    },
    analyticsChartTitle: {
      color: '#2a3f9d',
      fontWeight: 600,
      fontSize: '0.95rem',
      marginBottom: '0.3rem',
    },
    analyticsPeak: {
      marginTop: 6, 
      color: '#2a3f9d',
      fontWeight: 600,
      fontSize: '0.95rem', 
      letterSpacing: '-0.5px',
    },

  };

  // Map patientId to attendance status
const attendanceMap = {};
attendanceRecords.forEach(rec => {
  if (rec.patient?._id) attendanceMap[rec.patient._id] = rec.status;
});

const openCheckInModal = (patientId, patientName) => {
  setSelectedPatientId(patientId);
  setSelectedPatientName(patientName);
  setShowCheckInModal(true);
};

const closeCheckInModal = () => {
  setShowCheckInModal(false);
  setSelectedPatientId(null);
  setSelectedPatientName('');
};

const confirmManualCheckIn = async () => {
  if (!selectedPatientId) return;
  setAttendanceLoading(true);
  try {
    const todayStr = getPhilippineDateStr();
    // Get Philippines time for the time field as well
    const now = new Date();
    const phTime = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000);
    const timeStr = phTime.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
    
    await api.post('/attendance/mark', {
      patientId: selectedPatientId,
      date: todayStr,
      status: 'present',
      time: timeStr
    }, {
      headers: getAuthHeader()
    });
    setSuccessMessage('Patient checked in successfully.');
    await fetchTodayAttendance();
    closeCheckInModal();
  } catch (err) {
    setError('Failed to check in patient.');
    closeCheckInModal();
  }
  setAttendanceLoading(false);
};

// Open cancel modal
const openCancelCheckInModal = (patientId, patientName, attendanceId) => {
  setCancelPatientId(patientId);
  setCancelPatientName(patientName);
  setCancelAttendanceId(attendanceId);
  setShowCancelCheckInModal(true);
};

// Close cancel modal
const closeCancelCheckInModal = () => {
  setShowCancelCheckInModal(false);
  setCancelPatientId(null);
  setCancelPatientName('');
  setCancelAttendanceId(null);
};

// Confirm cancel check-in
const confirmCancelCheckIn = async () => {
  if (!cancelAttendanceId) return;
  setAttendanceLoading(true);
  try {
    await api.delete(`/attendance/${cancelAttendanceId}`, {
      headers: getAuthHeader()
    });
    setSuccessMessage('Check-in cancelled successfully.');
    await fetchTodayAttendance();
    closeCancelCheckInModal();
  } catch (err) {
    setError('Failed to cancel check-in.');
    closeCancelCheckInModal();
  }
  setAttendanceLoading(false);
};

function getPhilippineDateStr() {
  const now = new Date();
  const phTime = new Date(now.getTime() + (8 * 60 - now.getTimezoneOffset()) * 60000);
  return phTime.toISOString().split('T')[0];
}

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      minHeight: '100vh'
    }}>
      <Container style={styles.container}>
        <div style={{ marginLeft: 240 }}>
          {admin && (
  <div style={{ marginBottom: '3rem', marginTop: '1rem' }}>
    <h1
      style={{
        fontWeight: 900,
        fontSize: '3.2rem',
        color: '#1a202c',
        letterSpacing: '-2px',
        marginBottom: '1rem',
        lineHeight: 1.1,
        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
      }}
    >
      Welcome back, 
      <span style={{ 
        background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 900,
        marginLeft: '0.5rem'
      }}>
        {admin.username}
      </span>
    </h1>
    <p style={{
      fontSize: '1.2rem',
      color: '#64748b',
      fontWeight: 500,
      margin: 0,
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
      letterSpacing: '0.025em',
      lineHeight: 1.4
    }}>
      Ready to manage your dialysis center with precision and ease
    </p>
  </div>
)}
          {}
          <div style={{
  marginBottom: '2.5rem',
  marginTop: '-0.5rem'
}}>
    <div style={{
      fontSize: '1.6rem',
      color: '#1a202c',
      fontWeight: 700,
      letterSpacing: '-0.025em',
      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
    }}>
      {new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </div>
</div>
          {/* Top Row - Capacity Analytics */}
          <Row className="g-3" style={{ marginBottom: '1rem' }}>
            <Col md={4}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid rgba(42, 63, 157, 0.08)',
                boxShadow: '0 8px 32px rgba(42, 63, 157, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                height: '260px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <div style={{
                  padding: '1rem 1.5rem',
                  background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
                  borderBottom: 'none',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1.5rem',
                    fontSize: '1.2rem',
                    color: 'rgba(255, 255, 255, 0.4)'
                  }}>📅</div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: 'white',
                    letterSpacing: '-0.025em',
                    textTransform: 'uppercase',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>MWF Schedule</div>
                </div>
                <div style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#374151',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>Morning</span>
                      <div style={{
                        backgroundColor: overallPatientCounts.morning.MWF >= 12 ? '#ef4444' : overallPatientCounts.morning.MWF >= 8 ? '#f59e0b' : '#22c55e',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>
                        {overallPatientCounts.morning.MWF}/15
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#f1f5f9',
                      borderRadius: '8px',
                      height: '6px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min((overallPatientCounts.morning.MWF / 15) * 100, 100)}%`,
                        height: '100%',
                        backgroundColor: overallPatientCounts.morning.MWF >= 12 ? '#ef4444' : overallPatientCounts.morning.MWF >= 8 ? '#f59e0b' : '#22c55e',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#374151',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>Afternoon</span>
                      <div style={{
                        backgroundColor: overallPatientCounts.afternoon.MWF >= 12 ? '#ef4444' : overallPatientCounts.afternoon.MWF >= 8 ? '#f59e0b' : '#22c55e',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>
                        {overallPatientCounts.afternoon.MWF}/15
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#f1f5f9',
                      borderRadius: '8px',
                      height: '6px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min((overallPatientCounts.afternoon.MWF / 15) * 100, 100)}%`,
                        height: '100%',
                        backgroundColor: overallPatientCounts.afternoon.MWF >= 12 ? '#ef4444' : overallPatientCounts.afternoon.MWF >= 8 ? '#f59e0b' : '#22c55e',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            
            <Col md={4}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid rgba(42, 63, 157, 0.08)',
                boxShadow: '0 8px 32px rgba(42, 63, 157, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                height: '260px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <div style={{
                  padding: '1rem 1.5rem',
                  background: 'linear-gradient(135deg, #1d2f7b 0%, #2a3f9d 100%)',
                  borderBottom: 'none',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1.5rem',
                    fontSize: '1.2rem',
                    color: 'rgba(255, 255, 255, 0.4)'
                  }}>🕐</div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: 'white',
                    letterSpacing: '-0.025em',
                    textTransform: 'uppercase',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>TTHS Schedule</div>
                </div>
                <div style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#374151',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>Morning</span>
                      <div style={{
                        backgroundColor: overallPatientCounts.morning.TTHS >= 12 ? '#ef4444' : overallPatientCounts.morning.TTHS >= 8 ? '#f59e0b' : '#22c55e',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>
                        {overallPatientCounts.morning.TTHS}/15
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#f1f5f9',
                      borderRadius: '8px',
                      height: '6px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min((overallPatientCounts.morning.TTHS / 15) * 100, 100)}%`,
                        height: '100%',
                        backgroundColor: overallPatientCounts.morning.TTHS >= 12 ? '#ef4444' : overallPatientCounts.morning.TTHS >= 8 ? '#f59e0b' : '#22c55e',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#374151',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>Afternoon</span>
                      <div style={{
                        backgroundColor: overallPatientCounts.afternoon.TTHS >= 12 ? '#ef4444' : overallPatientCounts.afternoon.TTHS >= 8 ? '#f59e0b' : '#22c55e',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                      }}>
                        {overallPatientCounts.afternoon.TTHS}/15
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#f1f5f9',
                      borderRadius: '8px',
                      height: '6px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min((overallPatientCounts.afternoon.TTHS / 15) * 100, 100)}%`,
                        height: '100%',
                        backgroundColor: overallPatientCounts.afternoon.TTHS >= 12 ? '#ef4444' : overallPatientCounts.afternoon.TTHS >= 8 ? '#f59e0b' : '#22c55e',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            
            <Col md={4}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid rgba(42, 63, 157, 0.08)',
                boxShadow: '0 8px 32px rgba(42, 63, 157, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                height: '260px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <div style={{
                  padding: '1rem 1.5rem',
                  background: 'linear-gradient(135deg, #4a6cf7 0%, #6366f1 100%)',
                  borderBottom: 'none',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1.5rem',
                    fontSize: '1.2rem',
                    color: 'rgba(255, 255, 255, 0.4)'
                  }}>🎯</div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: 'white',
                    letterSpacing: '-0.025em',
                    textTransform: 'uppercase',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>Optimal Assignments</div>
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                  {/* 1st Priority */}
                  <div style={{ marginBottom: '1rem' }}>
                    {assignmentRecommendations.length > 0 ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        textAlign: 'center',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '-6px',
                          left: '8px',
                          backgroundColor: '#ffd700',
                          color: '#1a202c',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                        }}>1ST</div>
                        <div style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'white',
                          letterSpacing: '-0.025em',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                          marginTop: '4px'
                        }}>
                          {assignmentRecommendations[0].name}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontWeight: 600,
                          marginTop: '2px',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                        }}>
                          {assignmentRecommendations[0].availableSlots} available slots
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#9ca3af', 
                        fontWeight: 500, 
                        textAlign: 'center',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                        padding: '1rem'
                      }}>
                        No recommendations
                      </div>
                    )}
                  </div>
                  
                  {/* 2nd Priority */}
                  <div>
                    {assignmentRecommendations.length > 1 ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        borderRadius: '12px',
                        padding: '0.75rem 1rem',
                        textAlign: 'center',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '-6px',
                          left: '8px',
                          backgroundColor: '#c0c0c0',
                          color: '#1a202c',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                        }}>2ND</div>
                        <div style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'white',
                          letterSpacing: '-0.025em',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                          marginTop: '4px'
                        }}>
                          {assignmentRecommendations[1].name}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontWeight: 600,
                          marginTop: '2px',
                          fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                        }}>
                          {assignmentRecommendations[1].availableSlots} available slots
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#9ca3af', 
                        fontWeight: 500, 
                        textAlign: 'center',
                        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                        padding: '1rem'
                      }}>
                        No 2nd option
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          {/* Bottom Row - Stats Only */}
          <Row className="g-3" style={{ marginBottom: '1rem' }}>
            <Col md={4}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid rgba(42, 63, 157, 0.08)',
                boxShadow: '0 8px 32px rgba(42, 63, 157, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                height: '140px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
                  height: '4px',
                  width: '100%'
                }}></div>
                <div style={{
                  padding: '1.5rem 1.25rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: 'calc(100% - 4px)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    fontSize: '1.5rem',
                    color: 'rgba(42, 63, 157, 0.3)'
                  }}>📅</div>
                  <div style={{
                    fontSize: '2.8rem',
                    fontWeight: 900,
                    color: '#2a3f9d',
                    lineHeight: 1,
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.05em',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>
                    {todayBookedAppointments.length}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>
                    Today's Appointments
                  </div>
                </div>
              </div>
            </Col>
            
            <Col md={4}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid rgba(42, 63, 157, 0.08)',
                boxShadow: '0 8px 32px rgba(42, 63, 157, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                height: '140px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #1d2f7b 0%, #2a3f9d 100%)',
                  height: '4px',
                  width: '100%'
                }}></div>
                <div style={{
                  padding: '1.5rem 1.25rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: 'calc(100% - 4px)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    fontSize: '1.5rem',
                    color: 'rgba(42, 63, 157, 0.3)'
                  }}>👥</div>
                  <div style={{
                    fontSize: '2.8rem',
                    fontWeight: 900,
                    color: '#2a3f9d',
                    lineHeight: 1,
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.05em',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>
                    {patients.length}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>
                    Registered Patients
                  </div>
                </div>
              </div>
            </Col>
            
            <Col md={4}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid rgba(42, 63, 157, 0.08)',
                boxShadow: '0 8px 32px rgba(42, 63, 157, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                height: '140px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #4a6cf7 0%, #6366f1 100%)',
                  height: '4px',
                  width: '100%'
                }}></div>
                <div style={{
                  padding: '1.5rem 1.25rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: 'calc(100% - 4px)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    fontSize: '1.5rem',
                    color: 'rgba(42, 63, 157, 0.3)'
                  }}>⚕️</div>
                  <div style={{
                    fontSize: '2.8rem',
                    fontWeight: 900,
                    color: '#2a3f9d',
                    lineHeight: 1,
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.05em',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>
                    {machines.length}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>
                    Available Machines
                  </div>
                </div>
              </div>
            </Col>
          </Row>



          {/* Success/Error Messages */}
          {successMessage && (
            <Alert 
              variant="success" 
              onClose={() => setSuccessMessage('')} 
              dismissible 
              style={styles.alert}
            >
              <FiCheckCircle size={20} />
              {successMessage}
            </Alert>
          )}
          
          {error && (
            <Alert 
              variant="danger" 
              onClose={() => setError('')} 
              dismissible 
              style={styles.alert}
            >
              <FiAlertCircle size={20} />
              {error}
            </Alert>
          )}
          

          {/* Patient Check-In Tracker */}
          <div style={{ marginTop: '3rem', marginBottom: '3rem' }}>
  <div style={{
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    border: '1px solid rgba(42, 63, 157, 0.08)',
    boxShadow: '0 8px 32px rgba(42, 63, 157, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }}>
    <div style={{
      padding: '1.5rem 2rem',
      background: 'linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)',
      borderBottom: 'none'
    }}>
      <h4 style={{
        fontSize: '1.1rem',
        fontWeight: 800,
        color: 'white',
        margin: 0,
        letterSpacing: '-0.025em',
        textTransform: 'uppercase',
        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
      }}>
        Today's Appointments
      </h4>
    </div>
    <div style={{ padding: '0' }}>
      <Table hover responsive style={{ 
        background: 'transparent', 
        margin: 0,
        fontSize: '0.9rem',
        fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
      }}>
        <thead style={{ 
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
          borderBottom: '2px solid #e2e8f0'
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
            }}>Patient Name</th>
            <th style={{
              color: '#374151',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.025em',
              textTransform: 'uppercase',
              padding: '1.25rem 1.5rem',
              borderBottom: 'none',
              fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
            }}>Slot</th>
            <th style={{
              color: '#374151',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.025em',
              textTransform: 'uppercase',
              padding: '1.25rem 1.5rem',
              borderBottom: 'none',
              fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
            }}>Time</th>
            <th style={{
              color: '#374151',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.025em',
              textTransform: 'uppercase',
              padding: '1.25rem 1.5rem',
              borderBottom: 'none',
              fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
            }}>Type</th>
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
            }}>Manual Check-In</th>
          </tr>
        </thead>
    <tbody>
      {attendanceLoading ? (
        <tr>
          <td colSpan={6} style={{ 
            textAlign: 'center', 
            padding: '3rem 2rem',
            borderBottom: 'none'
          }}>
            <Spinner animation="border" style={{ color: '#2a3f9d' }} />
            <div style={{ 
              color: '#64748b', 
              marginTop: '1rem',
              fontSize: '0.9rem',
              fontWeight: 500,
              fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
            }}>Loading check-in tracker...</div>
          </td>
        </tr>
      ) : todayAppointments.length === 0 ? (
        <tr>
          <td colSpan={6} style={{ 
            textAlign: 'center', 
            color: '#64748b', 
            fontWeight: 500, 
            padding: '3rem 2rem',
            fontSize: '0.95rem',
            fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
            borderBottom: 'none'
          }}>
            📅 No confirmed appointments for today.
          </td>
        </tr>
      ) : (
        todayAppointments.map((appointment, idx) => {
          const patientId = appointment.patient?._id;
          const attendanceStatus = attendanceMap[patientId];
          const attendanceRecord = attendanceRecords.find(rec => rec.patient?._id === patientId && rec.date === getPhilippineDateStr());
          
          return (
            <tr key={appointment._id || idx} style={{
              borderBottom: '1px solid #f1f5f9',
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
                {appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Unassigned'}
              </td>
              <td style={{
                padding: '1.25rem 1.5rem',
                borderBottom: 'none',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#374151'
              }}>
                {appointment.slotNumber}
              </td>
              <td style={{ 
                textTransform: 'capitalize',
                padding: '1.25rem 1.5rem',
                borderBottom: 'none',
                fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#374151'
              }}>{appointment.timeSlot}</td>
              <td style={{
                padding: '1.25rem 1.5rem',
                borderBottom: 'none'
              }}>
                {appointment.isReschedule ? (
                  <Badge style={{ 
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    fontSize: '0.8rem',
                    padding: '0.4em 0.8em',
                    borderRadius: '12px',
                    fontWeight: 600,
                    border: 'none'
                  }}>Rescheduled</Badge>
                ) : (
                  <Badge style={{ 
                    backgroundColor: '#2a3f9d',
                    color: 'white',
                    fontSize: '0.8rem',
                    padding: '0.4em 0.8em',
                    borderRadius: '12px',
                    fontWeight: 600,
                    border: 'none'
                  }}>Regular</Badge>
                )}
              </td>
              <td style={{
                padding: '1.25rem 1.5rem',
                borderBottom: 'none'
              }}>
                {attendanceStatus === 'present' ? (
                  <Badge style={{ 
                    backgroundColor: '#22c55e',
                    color: 'white',
                    fontSize: '0.85rem',
                    padding: '0.5em 1em',
                    borderRadius: '20px',
                    fontWeight: 700,
                    border: 'none',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>✓ Checked In</Badge>
                ) : (
                  <Badge style={{ 
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    fontSize: '0.85rem',
                    padding: '0.5em 1em',
                    borderRadius: '20px',
                    fontWeight: 700,
                    border: 'none',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif'
                  }}>⏳ Pending</Badge>
                )}
              </td>
              <td style={{
                padding: '1.25rem 1.5rem',
                borderBottom: 'none'
              }}>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={
                    attendanceStatus === 'present' ||
                    !appointment.patient ||
                    attendanceLoading
                  }
                  onClick={() => openCheckInModal(patientId, `${appointment.patient.firstName} ${appointment.patient.lastName}`)}
                  style={{ 
                    backgroundColor: attendanceStatus === 'present' ? '#e5e7eb' : '#2a3f9d',
                    borderColor: attendanceStatus === 'present' ? '#e5e7eb' : '#2a3f9d',
                    color: attendanceStatus === 'present' ? '#9ca3af' : 'white',
                    borderRadius: '12px', 
                    fontWeight: 700, 
                    fontSize: '0.8rem', 
                    marginRight: '0.5rem',
                    padding: '0.5rem 1rem',
                    fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                    border: 'none',
                    boxShadow: attendanceStatus !== 'present' ? '0 2px 4px rgba(42, 63, 157, 0.2)' : 'none'
                  }}
                >
                  Check In
                </Button>
                {attendanceStatus === 'present' && attendanceRecord && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    disabled={attendanceLoading}
                    onClick={() => openCancelCheckInModal(patientId, `${appointment.patient.firstName} ${appointment.patient.lastName}`, attendanceRecord._id)}
                    style={{ 
                      borderColor: '#ef4444',
                      color: '#ef4444',
                      backgroundColor: 'transparent',
                      borderRadius: '12px', 
                      fontWeight: 700, 
                      fontSize: '0.8rem',
                      padding: '0.5rem 1rem',
                      fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
                      borderWidth: '2px'
                    }}
                  >
                    Cancel Check-In
                  </Button>
                )}
              </td>
            </tr>
          );
        })
      )}
    </tbody>
      </Table>
    </div>
  </div>
</div>

{/* Confirmation Modal for Check-In */}
<Modal show={showCheckInModal} onHide={closeCheckInModal} centered>
  <Modal.Header closeButton>
    <Modal.Title>Confirm Check-In</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    Are you sure you want to mark <b>{selectedPatientName}</b> as checked in for today?
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={closeCheckInModal}>
      Cancel
    </Button>
    <Button variant="primary" onClick={confirmManualCheckIn} disabled={attendanceLoading}>
      Yes, Check In
    </Button>
  </Modal.Footer>
</Modal>

{/* Confirmation Modal for Cancel Check-In */}
<Modal show={showCancelCheckInModal} onHide={closeCancelCheckInModal} centered>
  <Modal.Header closeButton>
    <Modal.Title>Cancel Check-In</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    Are you sure you want to <b>cancel the check-in</b> for <b>{cancelPatientName}</b>?
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={closeCancelCheckInModal}>
      No, Keep Checked In
    </Button>
    <Button variant="danger" onClick={confirmCancelCheckIn} disabled={attendanceLoading}>
      Yes, Cancel Check-In
    </Button>
  </Modal.Footer>
</Modal>
          
        </div>
      </Container>
    </div>
  );
};

export default Dashboard;