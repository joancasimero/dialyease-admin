import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Alert, Badge, Spinner, Modal } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AdminManagement.css'; // Import your custom CSS
import { FiSearch, FiFilter } from 'react-icons/fi'; // Add at the top
import logo from '../../assets/logo.png'; // Add this at the top with other imports

const getRoleBadgeVariant = (role) => {
  switch (role) {
    case 'super_admin':
      return 'admin-badge superadmin';
    case 'admin':
      return 'admin-badge';
    default:
      return 'admin-badge';
  }
};

const AdminManagement = () => {
  const { currentUser, authToken, isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activeAdmins, setActiveAdmins] = useState([]);
  const [archivedAdmins, setArchivedAdmins] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionModal, setActionModal] = useState({
    show: false,
    type: '', // 'promote', 'demote', 'archive', 'activate'
    admin: null,
  });
  const [profileModal, setProfileModal] = useState({
    show: false,
    admin: null,
  });
  const [editProfile, setEditProfile] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    position: '',
    department: '',
    employeeId: '',
    role: 'admin'
  });

  const [editFormData, setEditFormData] = useState({});

  const employeeIdRegex = /^(ADM-\d{4}-\d{3}|HP-\d{4}-\d{3})$/;
  const contactNumberRegex = /^\d{11}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [filterText, setFilterText] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Toggle admin active/archived status
  const handleToggleAdminStatus = async (adminId) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/admin/${adminId}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setSuccess('Admin status updated successfully!');
      fetchAdmins();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to update admin status.'
      );
    }
  };

  // Handle role change (promote/demote admin)
  const handleRoleChange = async (adminId, newRole) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/admin/${adminId}/change-role`, { role: newRole }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setSuccess('Admin role updated successfully!');
      fetchAdmins();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to update admin role.'
      );
    }
  };

  // Handle create admin form submission
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!employeeIdRegex.test(formData.employeeId)) {
      setError('Employee ID must be in the format ADM-YYYY-000 or HP-YYYY-000.');
      return;
    }

    if (!contactNumberRegex.test(formData.contactNumber)) {
      setError('Contact number must be exactly 11 digits.');
      return;
    }

    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setCreating(true);
    try {
      const payload = { ...formData };
      delete payload.confirmPassword;

      await api.post('/admin/create', payload, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setSuccess('Admin created successfully!');
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        contactNumber: '',
        position: '',
        department: '',
        employeeId: '',
        role: 'admin'
      });
      fetchAdmins();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to create admin.'
      );
    } finally {
      setCreating(false);
    }
  };

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/all', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const admins = response.data;
      setActiveAdmins(admins.filter(a => a.isActive));
      setArchivedAdmins(admins.filter(a => !a.isActive));
    } catch (err) {
      console.error('Error fetching admins:', err);
      console.error('Error response:', err.response); // Debug log
      
      if (err.response?.status === 403) {
        setError('Access denied: Super Admin privileges required');
      } else if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else {
        setError(
          err.response?.data?.message || 
          err.message || 
          'Failed to fetch admins'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    // Wait for auth context to initialize
    if (currentUser !== null) {
      setIsInitialized(true);
      if (isSuperAdmin && authToken) {
        fetchAdmins();
      } else if (!isSuperAdmin) {
        setLoading(false); // Stop loading if not super admin
      }
    }
  }, [currentUser, isSuperAdmin, authToken, fetchAdmins]);

  // Show loading while auth is initializing
  if (!isInitialized) {
    return (
      <div className="admin-management-page">
        <Container className="admin-management-container">
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="admin-management-page">
        <Container className="admin-management-container">
          <Alert variant="danger" className="admin-alert admin-alert-error">
            Access Denied: Super Admin privileges required.
          </Alert>
        </Container>
      </div>
    );
  }

  // Add this above your component for section styling
  const SectionHeader = ({ children }) => (
    <div className="admin-section-header">{children}</div>
  );

  const filteredAdmins = (showArchived ? archivedAdmins : activeAdmins).filter(admin => {
    const search = filterText.toLowerCase();
    const matchesText =
      (admin.firstName && admin.firstName.toLowerCase().includes(search)) ||
      (admin.middleName && admin.middleName.toLowerCase().includes(search)) ||
      (admin.lastName && admin.lastName.toLowerCase().includes(search)) ||
      (admin.username && admin.username.toLowerCase().includes(search)) ||
      (admin.email && admin.email.toLowerCase().includes(search));
    const matchesDepartment = filterDepartment ? admin.department === filterDepartment : true;
    const matchesRole = filterRole ? admin.role === filterRole : true;
    return matchesText && matchesDepartment && matchesRole;
  });

  return (
    <div className="admin-management-page">
      <Container className="admin-management-container">
        <h2 className="admin-management-title">Admin Management</h2>
        {error && (
          <div className="admin-alert admin-alert-error" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="admin-alert admin-alert-success" role="alert">
            {success}
          </div>
        )}

        <div className="admin-management-content" style={{ flexDirection: 'column', gap: '2rem' }}>
          {/* Create Admin Form Section */}
          <div className="admin-box">
            <Form className="admin-form modern-admin-form" onSubmit={e => e.preventDefault()}>
              <SectionHeader>
                Personal Details
              </SectionHeader>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label className="admin-form-label">First Name *</label>
                  <input
                    className="admin-form-input"
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    placeholder="Enter first name"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Last Name *</label>
                  <input
                    className="admin-form-input"
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    placeholder="Enter last name"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Middle Name</label>
                  <input
                    className="admin-form-input"
                    type="text"
                    value={formData.middleName}
                    onChange={e => setFormData({ ...formData, middleName: e.target.value })}
                    placeholder="Enter middle name (optional)"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Email Address *</label>
                  <input
                    className="admin-form-input"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="Enter email address"
                    pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                    title="Please enter a valid email address"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Contact Number *</label>
                  <input
                    className="admin-form-input"
                    type="tel"
                    value={formData.contactNumber}
                    onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                    required
                    placeholder="Enter contact number"
                    pattern="\d{11}"
                    title="Contact number must be exactly 11 digits"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Position *</label>
                  <input
                    className="admin-form-input"
                    type="text"
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                    required
                    placeholder="Enter position/job title"
                  />
                </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Department *</label>
                    <Form.Select
                      className="admin-form-input"
                      name="department"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Administration Office">Administration Office</option>
                      <option value="HP Unit">HP Unit</option>
                    </Form.Select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Employee ID *</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.employeeId}
                      onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                      placeholder="ADM-2025-001 or HP-2025-001"
                      required
                      pattern="^(ADM-\d{4}-\d{3}|HP-\d{4}-\d{3})$"
                      title="Employee ID must be ADM-YYYY-000 or HP-YYYY-000"
                    />
                  </div>
              </div>

              <SectionHeader>
                Account Details
              </SectionHeader>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label className="admin-form-label">Username *</label>
                  <input
                    className="admin-form-input"
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    required
                    placeholder="Enter username"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Password *</label>
                  <input
                    className="admin-form-input"
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={9}
                    placeholder="Enter password (min 9 characters)"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Confirm Password *</label>
                  <input
                    className="admin-form-input"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    placeholder="Confirm password"
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Role *</label>
                  <Form.Select
                    className="admin-form-input"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </Form.Select>
                </div>
              </div>

              <div className="admin-management-actions modern-actions">
                <Button
                  variant="secondary"
                  className="admin-action-btn"
                  onClick={() => setFormData({
                    username: '',
                    password: '',
                    confirmPassword: '',
                    firstName: '',
                    middleName: '',
                    lastName: '',
                    email: '',
                    contactNumber: '',
                    position: '',
                    department: 'PhilHealth Office',
                    role: 'admin'
                  })}
                  disabled={creating}
                >
                  Clear Form
                </Button>
                <Button
                  type="button"
                  className="admin-form-btn"
                  disabled={creating}
                  onClick={() => setShowConfirmModal(true)}
                >
                  {creating ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Creating...
                    </>
                  ) : (
                    'Create Admin'
                  )}
                </Button>
              </div>
            </Form>
          </div>

          {/* Admins List Section */}
          <div className="admin-box">
            <div className="admin-form-title" style={{ marginBottom: '1.2rem' }}>
              <i className="fas fa-users-cog"></i> Current Admins
              <Button
                variant={showArchived ? "primary" : "outline-primary"}
                size="sm"
                style={{ marginLeft: '1rem' }}
                onClick={() => setShowArchived(false)}
              >
                Active Admins
              </Button>
              <Button
                variant={showArchived ? "outline-danger" : "danger"}
                size="sm"
                style={{ marginLeft: '0.5rem' }}
                onClick={() => setShowArchived(true)}
              >
                Inactive Admins
              </Button>
            </div>
            <div className="modern-filter-bar">
              <div className="filter-logo">
                {/* Replace with your logo image if you want */}
                <img src={logo} alt="Logo" style={{ height: 32, marginRight: 18 }} />
              </div>
              <div className="filter-search-container">
                <input
                  type="search"
                  className="filter-search-input"
                  placeholder="Search admin..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                />
                <FiSearch className="filter-search-icon" />
              </div>
              <button
                className="filter-btn"
                type="button"
                onClick={() => setShowFilters(prev => !prev)}
              >
                <FiFilter style={{ marginRight: 8 }} />
                FILTERS
              </button>
              {showFilters && (
                <div className="filter-dropdowns">
                  <select
                    className="filter-dropdown"
                    value={filterDepartment}
                    onChange={e => setFilterDepartment(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    <option value="Administration Office">Administration Office</option>
                    <option value="HP Unit">HP Unit</option>
                  </select>
                  <select
                    className="filter-dropdown"
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              )}
            </div>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading admins...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table className="admin-table" hover size="sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Position</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Created Date</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdmins.map((admin) => (
                      <tr
                        key={admin._id}
                        style={{ cursor: admin._id !== currentUser._id ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (admin._id !== currentUser._id) {
                            setProfileModal({ show: true, admin });
                          }
                        }}
                      >
                        <td>
                          {`${admin.firstName || ''} ${admin.middleName ? admin.middleName + ' ' : ''}${admin.lastName || ''}`}
                        </td>
                        <td>{admin.username}</td>
                        <td>{admin.email || 'N/A'}</td>
                        <td>{admin.position || 'N/A'}</td>
                        <td>{admin.department || 'N/A'}</td>
                        <td>
                          <span className={getRoleBadgeVariant(admin.role)}>
                            {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${admin.isActive ? '' : 'archived'}`}>
                            {admin.isActive ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td>
                          {new Date(admin.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td>
                          {admin.createdBy ?
                            `${admin.createdBy.firstName || ''} ${admin.createdBy.lastName || ''}`.trim() || admin.createdBy.username
                            : 'System'
                          }
                        </td>
                        <td>
                          {admin._id !== currentUser._id ? (
                            <div className="d-flex gap-1 flex-wrap">
                              {showArchived ? (
                                <Button
                                  size="sm"
                                  className="admin-action-btn"
                                  style={{ background: '#059669', color: '#fff' }}
                                  onClick={() => setActionModal({ show: true, type: 'activate', admin })}
                                >
                                  Activate
                                </Button>
                              ) : (
                                <>
                                  {admin.role === 'admin' && (
                                    <Button
                                      size="sm"
                                      className="admin-action-btn"
                                      onClick={() => setActionModal({ show: true, type: 'promote', admin })}
                                    >
                                      Promote
                                    </Button>
                                  )}
                                  {admin.role === 'super_admin' && (
                                    <Button
                                      size="sm"
                                      className="admin-action-btn"
                                      style={{ background: '#f59e42', color: '#fff' }}
                                      onClick={() => setActionModal({ show: true, type: 'demote', admin })}
                                    >
                                      Demote
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    className="admin-action-btn"
                                    style={{ background: '#dc2626', color: '#fff' }}
                                    onClick={() => setActionModal({ show: true, type: 'archive', admin })}
                                  >
                                    Archive
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="admin-badge" style={{ background: '#38bdf8', color: '#fff' }}>
                              Current User
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* Confirmation Modal */}
      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Admin Creation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to create this admin?</p>
          <div style={{ fontSize: '0.97em' }}>
            <strong>Full Name:</strong> {formData.firstName} {formData.middleName} {formData.lastName}<br />
            <strong>Username:</strong> {formData.username}<br />
            <strong>Email:</strong> {formData.email}<br />
            <strong>Contact Number:</strong> {formData.contactNumber}<br />
            <strong>Position:</strong> {formData.position}<br />
            <strong>Department:</strong> {formData.department}<br />
            <strong>Employee ID:</strong> {formData.employeeId}<br />
            <strong>Role:</strong> {formData.role === 'super_admin' ? 'Super Admin' : 'Admin'}<br />
            <strong>Password:</strong> {formData.password}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={(e) => {
              setShowConfirmModal(false);
              handleCreateAdmin(e);
            }}
            disabled={creating}
          >
            Confirm & Create
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal
        show={actionModal.show}
        onHide={() => setActionModal({ show: false, type: '', admin: null })}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {actionModal.type === 'promote' && 'Confirm Promotion'}
            {actionModal.type === 'demote' && 'Confirm Demotion'}
            {actionModal.type === 'archive' && 'Confirm Archiving'}
            {actionModal.type === 'activate' && 'Confirm Activation'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionModal.admin && (
            <>
              <p>
                {actionModal.type === 'promote' && (
                  <>Are you sure you want to <b>promote</b> <b>{actionModal.admin.firstName} {actionModal.admin.lastName}</b> to Super Admin?</>
                )}
                {actionModal.type === 'demote' && (
                  <>Are you sure you want to <b>demote</b> <b>{actionModal.admin.firstName} {actionModal.admin.lastName}</b> to Admin?</>
                )}
                {actionModal.type === 'archive' && (
                  <>Are you sure you want to <b>archive</b> <b>{actionModal.admin.firstName} {actionModal.admin.lastName}</b>?</>
                )}
                {actionModal.type === 'activate' && (
                  <>Are you sure you want to <b>activate</b> <b>{actionModal.admin.firstName} {actionModal.admin.lastName}</b>?</>
                )}
              </p>
              <div style={{ fontSize: '0.97em' }}>
                <strong>Username:</strong> {actionModal.admin.username}<br />
                <strong>Email:</strong> {actionModal.admin.email}<br />
                <strong>Role:</strong> {actionModal.admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}<br />
                <strong>Status:</strong> {actionModal.admin.isActive ? 'Active' : 'Archived'}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setActionModal({ show: false, type: '', admin: null })}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (!actionModal.admin) return;
              setActionModal({ show: false, type: '', admin: null });
              if (actionModal.type === 'promote') {
                await handleRoleChange(actionModal.admin._id, 'super_admin');
              } else if (actionModal.type === 'demote') {
                await handleRoleChange(actionModal.admin._id, 'admin');
              } else if (actionModal.type === 'archive' || actionModal.type === 'activate') {
                await handleToggleAdminStatus(actionModal.admin._id);
              }
            }}
            disabled={loading}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Profile Modal */}
      <Modal
        show={profileModal.show}
        onHide={() => {
          setProfileModal({ show: false, admin: null });
          setEditProfile(false);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Admin Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {profileModal.admin && !editProfile && (
            <div style={{ fontSize: '1em' }}>
              <strong>Full Name:</strong> {profileModal.admin.firstName} {profileModal.admin.middleName} {profileModal.admin.lastName}<br />
              <strong>Username:</strong> {profileModal.admin.username}<br />
              <strong>Email:</strong> {profileModal.admin.email}<br />
              <strong>Contact Number:</strong> {profileModal.admin.contactNumber}<br />
              <strong>Position:</strong> {profileModal.admin.position}<br />
              <strong>Department:</strong> {profileModal.admin.department}<br />
              <strong>Employee ID:</strong> {profileModal.admin.employeeId}<br />
              <strong>Role:</strong> {profileModal.admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}<br />
              <strong>Status:</strong> {profileModal.admin.isActive ? 'Active' : 'Archived'}<br />
              <strong>Created Date:</strong> {new Date(profileModal.admin.createdAt).toLocaleString()}<br />
              <strong>Created By:</strong> {profileModal.admin.createdBy ? (
                `${profileModal.admin.createdBy.firstName || ''} ${profileModal.admin.createdBy.lastName || ''}`.trim() || profileModal.admin.createdBy.username
              ) : 'System'}
            </div>
          )}
          {profileModal.admin && editProfile && (
            <Form
              onSubmit={async (e) => {
                e.preventDefault();
                // Call your API to update admin info here
                try {
                  await api.patch(`/admin/${profileModal.admin._id}/update`, editFormData, {
                    headers: { Authorization: `Bearer ${authToken}` }
                  });
                  setSuccess('Admin info updated!');
                  setEditProfile(false);
                  fetchAdmins();
                  setProfileModal({ show: false, admin: null });
                } catch (err) {
                  setError(
                    err.response?.data?.message ||
                    err.message ||
                    'Failed to update admin info.'
                  );
                }
              }}
            >
              <Form.Group>
                <Form.Label>First Name</Form.Label>
                <Form.Control
                  value={editFormData.firstName}
                  onChange={e => setEditFormData({ ...editFormData, firstName: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Middle Name</Form.Label>
                <Form.Control
                  value={editFormData.middleName}
                  onChange={e => setEditFormData({ ...editFormData, middleName: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  value={editFormData.lastName}
                  onChange={e => setEditFormData({ ...editFormData, lastName: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  value={editFormData.email}
                  onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Contact Number</Form.Label>
                <Form.Control
                  value={editFormData.contactNumber}
                  onChange={e => setEditFormData({ ...editFormData, contactNumber: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Position</Form.Label>
                <Form.Control
                  value={editFormData.position}
                  onChange={e => setEditFormData({ ...editFormData, position: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Department</Form.Label>
                <Form.Control
                  value={editFormData.department}
                  onChange={e => setEditFormData({ ...editFormData, department: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Employee ID</Form.Label>
                <Form.Control
                  value={editFormData.employeeId}
                  onChange={e => setEditFormData({ ...editFormData, employeeId: e.target.value })}
                />
              </Form.Group>
              <Button variant="primary" type="submit" style={{ marginTop: '1rem' }}>
                Save Changes
              </Button>
              <Button variant="secondary" onClick={() => setEditProfile(false)} style={{ marginLeft: '0.5rem', marginTop: '1rem' }}>
                Cancel
              </Button>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!editProfile && (
            <Button variant="warning" onClick={() => {
              setEditProfile(true);
              setEditFormData({ ...profileModal.admin });
            }}>
              Edit
            </Button>
          )}
          <Button variant="secondary" onClick={() => {
            setProfileModal({ show: false, admin: null });
            setEditProfile(false);
          }}>
            Close
            </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminManagement;
