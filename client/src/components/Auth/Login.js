import React, { useState, useEffect } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { PersonFill, LockFill } from 'react-bootstrap-icons';
import authService from '../../services/authService';
import './Login.css'; 

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockout, setLockout] = useState(false);
  const [timer, setTimer] = useState(300);

  const navigate = useNavigate();
  const { username, password, rememberMe } = formData;

  useEffect(() => {
    let interval;
    if (lockout) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setLockout(false);
            setFailedAttempts(0);
            setTimer(300);
            setWarning('');
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockout]);

  const formatTimer = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (lockout) return;
    setLoading(true);
    setError('');
    setWarning('');

    try {
      await authService.login({ username, password, rememberMe });
      navigate('/dashboard');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setError(err.response.data.message || 'Account has been disabled. Please contact an administrator.');
        setLoading(false);
        return;
      }

      setFailedAttempts((prev) => {
        const newAttempts = prev + 1;
        if (newAttempts === 1) {
          setWarning('3 failed attempts will lock your account for 5 minutes');
        } else if (newAttempts === 2) {
          setWarning('2 failed attempts remaining');
        } else if (newAttempts === 3) {
          setWarning('');
          setLockout(true);
        }
        return newAttempts;
      });

      setError('Invalid credentials');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left-panel">
        <div>
          <img src="/images/loginlogo.png" alt="DialyEase System" className="login-image" />
          <h2 className="login-title">DialyEase</h2>
          <p className="login-subtitle">Administration Portal</p>
        </div>
      </div>

      <div className="login-form-section">
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome to DialyEase Admin Portal</h1>
          <p className="welcome-subtitle">Empowering you to manage with precision and ease.</p>
        </div>

        <Form onSubmit={onSubmit} className="login-form">
          <Form.Group>
            <Form.Label>Username</Form.Label>
            <div className="input-with-icon">
              <PersonFill className="input-icon" />
              <Form.Control
                type="text"
                name="username"
                value={username}
                onChange={onChange}
                placeholder="Enter username"
                disabled={lockout}
                required
                className="form-control-with-icon"
              />
            </div>
          </Form.Group>
  
          <Form.Group className="mt-3">
            <Form.Label>Password</Form.Label>
            <div className="input-with-icon">
              <LockFill className="input-icon" />
              <Form.Control
                type="password"
                name="password"
                value={password}
                onChange={onChange}
                placeholder="Enter password"
                disabled={lockout}
                required
                className="form-control-with-icon"
              />
            </div>
          </Form.Group>
  
          <Form.Group className="mt-3">
            <Form.Check
              type="checkbox"
              label="Remember Me"
              name="rememberMe"
              checked={rememberMe}
              onChange={onChange}
              disabled={lockout}
            />
          </Form.Group>
  
          <Button 
            type="submit" 
            disabled={loading || lockout} 
            className="login-button"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <div className="forgot-password-section">
            <span
              className="forgot-password-link"
              style={{ cursor: 'pointer', color: '#0d6efd' }}
              onClick={() => navigate('/forgot-password')}
            >
              Forgot Password?
            </span>
          </div>

          <div className="mt-3">
            {error && <Alert variant="danger">{error}</Alert>}
            {warning && !lockout && <Alert variant="warning">{warning}</Alert>}
            {lockout && (
              <Alert variant="warning">
                Too many failed attempts. Try again in {formatTimer(timer)}
              </Alert>
            )}
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;