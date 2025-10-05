import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: Request OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.requestAdminOtp(email);
      setSuccess('OTP sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.verifyAdminOtp(email, otp);
      setSuccess('OTP verified. You may now reset your password.');
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.resetAdminPassword(email, newPassword);
      setSuccess('Password reset successful! You may now log in.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-left-panel">
        <div>
          <img src="/images/loginlogo.png" alt="DialyEase System" className="login-image" />
          <h2 className="forgot-password-title">DialyEase</h2>
          <p className="forgot-password-subtitle">Administration Portal</p>
        </div>
      </div>
      <div className="forgot-password-form-section">
        <div className="welcome-section">
          <h1 className="welcome-title">Forgot Your Password?</h1>
          <p className="welcome-subtitle">
            {step === 1 && 'Enter your email to receive an OTP code.'}
            {step === 2 && 'Enter the OTP code sent to your email.'}
            {step === 3 && 'Set your new password.'}
          </p>
        </div>
        <Form
          onSubmit={
            step === 1
              ? handleEmailSubmit
              : step === 2
              ? handleOtpSubmit
              : handlePasswordSubmit
          }
          className="forgot-password-form"
        >
          {step === 1 && (
            <Form.Group>
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </Form.Group>
          )}
          {step === 2 && (
            <Form.Group>
              <Form.Label>OTP Code</Form.Label>
              <Form.Control
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="Enter OTP"
                required
              />
            </Form.Group>
          )}
          {step === 3 && (
            <Form.Group>
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </Form.Group>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="forgot-password-button"
          >
            {loading
              ? 'Processing...'
              : step === 1
              ? 'Send OTP'
              : step === 2
              ? 'Verify OTP'
              : 'Reset Password'}
          </Button>
          <div className="mt-3">
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
          </div>
          <div className="forgot-password-section">
            <span
              className="forgot-password-link"
              style={{ cursor: 'pointer', color: '#0d6efd' }}
              onClick={() => navigate('/login')}
            >
              Back to Login
            </span>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default ForgotPassword;