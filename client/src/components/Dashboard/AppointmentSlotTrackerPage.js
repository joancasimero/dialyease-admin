
import React from 'react';
import AppointmentSlotTracker from './AppointmentSlotTracker';
import { useAuth } from '../../context/AuthContext';

const AppointmentSlotTrackerPage = () => {
  const { authToken } = useAuth();
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5faff 60%, #e0e7ff 100%)',
      fontFamily: "'Inter Tight', 'Inter', 'Segoe UI', sans-serif",
      boxSizing: 'border-box',
      overflowX: 'auto',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 0,
        boxShadow: 'none',
        padding: '3rem 2.5rem',
        minHeight: '100vh',
        marginLeft: 280, // Increased margin to prevent overlap with sidebar
        marginRight: 20,
        width: 'auto',
        maxWidth: 'calc(100vw - 300px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
      }}>
        <div style={{
          marginBottom: '2.5rem'
        }}>
          <h1 style={{
            fontWeight: '800',
            fontSize: '3.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            lineHeight: '1.2',
            letterSpacing: '-0.025em',
            fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
            color: '#2a3f9d',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            margin: 0,
            marginBottom: '1rem'
          }}>
            Appointment Slot Tracker
          </h1>
          <p style={{
            fontSize: '1.05rem',
            color: '#6b7280',
            maxWidth: '600px',
            lineHeight: '1.4',
            fontWeight: '500',
            letterSpacing: '0.025em',
            fontFamily: 'Inter Tight, Inter, Segoe UI, sans-serif',
            margin: 0
          }}>
            Manage appointments and track slot availability in real-time.
          </p>
        </div>
        <div style={{ width: '100%' }}>
          <AppointmentSlotTracker authToken={authToken} />
        </div>
      </div>
    </div>
  );
};

export default AppointmentSlotTrackerPage;
