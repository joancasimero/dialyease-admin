import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  Table,
  Form,
  Pagination,
  Button,
  Modal,
  Spinner,
  Row,
  Col,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const PatientsPage = () => {
  const { isSuperAdmin } = useAuth();
  const [patients, setPatients] = useState([]);
  const [archivedPatients, setArchivedPatients] = useState([]); 
  const [showArchived, setShowArchived] = useState(false); 
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [patientsPerPage] = useState(20);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [deletePatientId, setDeletePatientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPatient, setViewPatient] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSchedule, setExportSchedule] = useState(""); 
  const [showArchivedModal, setShowArchivedModal] = useState(false); 
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordChangePatient, setPasswordChangePatient] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [sortBy, setSortBy] = useState("name"); // "name", "schedule"
  const [scheduleFilter, setScheduleFilter] = useState(""); // "", "MWF", "TTHS" 

  useEffect(() => {
    fetchPatients();
    fetchArchivedPatients(); 
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients');
      console.log('📊 Patients Response:', response.data); // DEBUG
      const patientsData = response.data.data || response.data;
      console.log('📊 Patients Data:', patientsData); // DEBUG
      console.log('📊 Total Patients:', patientsData.length); // DEBUG
      setPatients(patientsData.filter(p => p.approved));
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedPatients = async () => {
    try {
      const response = await api.get('/patients/archived');
      setArchivedPatients(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error("Error fetching archived patients:", error);
      setArchivedPatients([]);
    }
  };

  // Filter patients by search term
  const searchFilteredPatients = patients.filter((patient) =>
    `${patient.firstName} ${patient.middleName || ""} ${patient.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Filter by schedule
  const scheduleFilteredPatients = scheduleFilter
    ? searchFilteredPatients.filter(p => p.dialysisSchedule === scheduleFilter)
    : searchFilteredPatients;

  // Sort patients
  const sortedPatients = [...scheduleFilteredPatients].sort((a, b) => {
    if (sortBy === "schedule") {
      // First sort by schedule (MWF comes before TTHS)
      if (a.dialysisSchedule !== b.dialysisSchedule) {
        return a.dialysisSchedule === "MWF" ? -1 : 1;
      }
      // Then sort alphabetically by name within same schedule
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    } else {
      // Sort alphabetically by name
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    }
  });

  const filteredPatients = sortedPatients;

  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(
    indexOfFirstPatient,
    indexOfLastPatient
  );
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  const handleEditPatient = (patient) => {
    setEditPatient({
      ...patient,
      birthday: patient.birthday ? patient.birthday.split("T")[0] : "",
      emergencyContact: patient.emergencyContact || {
        name: "",
        relationship: "",
        phone: "",
      },
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(
        `/patients/${editPatient._id}`,
        editPatient
      );
      const updatedPatient = response.data.patient || response.data;
      setPatients((prev) =>
        prev.map((p) => (p._id === updatedPatient._id ? updatedPatient : p))
      );
      setShowEditModal(false);
      setEditPatient(null);
    } catch (error) {
      alert(
        "Update failed: " + (error.response?.data?.message || "Try again.")
      );
    }
  };

  const handleArchiveClick = (id) => {
    setDeletePatientId(id);
    setShowDeleteModal(true);
  };

  const confirmArchive = async () => {
    try {
      await api.delete(
        `/patients/${deletePatientId}`
      );
      setPatients((prev) => prev.filter((p) => p._id !== deletePatientId));
      fetchArchivedPatients(); 
      setShowDeleteModal(false);
    } catch (error) {
      alert(
        "Archive failed: " + (error.response?.data?.message || "Try again.")
      );
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.put(`/patients/${id}/restore`);
      fetchPatients();
      fetchArchivedPatients();
    } catch (error) {
      alert(
        "Restore failed: " + (error.response?.data?.message || "Try again.")
      );
    }
  };

  const handleDeleteClick = (id) => {
    setDeletePatientId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(
        `/patients/${deletePatientId}`
      );
      setPatients((prev) => prev.filter((p) => p._id !== deletePatientId));
      setShowDeleteModal(false);
    } catch (error) {
      alert(
        "Delete failed: " + (error.response?.data?.message || "Try again.")
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditPatient((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (e) => {
    const { name, value } = e.target;
    setEditPatient((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value,
      },
    }));
  };

  const handleViewPatient = (patient) => {
    setViewPatient(patient);
    setShowViewModal(true);
  };

  const exportPatientsPDF = async (patientsToExport) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/patients/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients: patientsToExport }),
      });
      if (!response.ok) {
        alert('Failed to export PDF');
        return;
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'patients.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export PDF');
    }
  };

  const exportSinglePatientPDF = async (patient) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/patients/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patients: [patient] }),
      });
      if (!response.ok) {
        alert('Failed to export PDF');
        return;
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${patient.lastName || 'patient'}_${patient.firstName || ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export PDF');
    }
  };

  const getExportFilteredPatients = () => {
    let list = showArchived ? archivedPatients : filteredPatients;
    if (exportSchedule) list = list.filter(p => p.dialysisSchedule === exportSchedule);
    return list;
  };

  const handleChangePasswordClick = (patient) => {
    setPasswordChangePatient(patient);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowChangePasswordModal(true);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");

    // Validation
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      const response = await api.put(
        `/patients/${passwordChangePatient._id}/change-password`,
        { newPassword }
      );

      if (response.data.success) {
        alert(`Password successfully changed for ${passwordChangePatient.firstName} ${passwordChangePatient.lastName}`);
        setShowChangePasswordModal(false);
        setPasswordChangePatient(null);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      setPasswordError(
        error.response?.data?.message || "Failed to change password. Please try again."
      );
    }
  };

  return (
    <>
      <style>
        {`
          .modern-modal .modal-content {
            border-radius: 20px !important;
            border: none !important;
            overflow: hidden !important;
          }
          .modern-modal .modal-header {
            border: none !important;
          }
          .modern-modal .modal-header .btn-close {
            filter: brightness(0) invert(1);
            opacity: 0.8;
          }
          .modern-modal .modal-header .btn-close:hover {
            opacity: 1;
          }
          .modern-modal .modal-body {
            border: none !important;
          }
        `}
      </style>
      <div
        style={{
          background: "linear-gradient(135deg, #f0f4ff 0%, #e8f1ff 100%)",
          minHeight: "100vh",
          padding: "2.5rem 1.5rem",
          fontFamily: "'Inter Tight', 'Inter', 'Segoe UI', sans-serif",
        }}
      >
      <div style={{ marginLeft: 240 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
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
                Patient Management
              </h2>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  marginBottom: 0,
                  fontSize: "1rem",
                  fontWeight: 500,
                }}
              >
                View and manage all patient records
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Button
                onClick={() => setShowArchivedModal(true)}
                style={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  borderRadius: "10px",
                  padding: "0.75rem 1.5rem",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  background: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(10px)",
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 8v13H3V8M1 3h22v5H1V3zm9 5v13m4-13v13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Archived
              </Button>
              <Button
                onClick={() => setShowExportModal(true)}
                style={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  borderRadius: "10px",
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  background: "#ffffff",
                  color: "#2a3f9d",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export PDF
              </Button>
            </div>
          </div>

          {/* Search Section */}
          <div
            style={{
              background: "#ffffff",
              padding: "1.5rem 2rem",
              borderRadius: "16px",
              boxShadow: "0 4px 12px rgba(42, 63, 157, 0.08)",
              marginBottom: "1.5rem",
            }}
          >
            <Form.Group controlId="search" style={{ marginBottom: 0 }}>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "2px solid rgba(42, 63, 157, 0.1)",
                  padding: "0.75rem 1rem",
                  transition: "all 0.2s ease",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ marginRight: "0.75rem", flexShrink: 0 }}
                >
                  <circle cx="11" cy="11" r="8" stroke="#4a6cf7" strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" stroke="#4a6cf7" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <Form.Control
                  type="text"
                  placeholder="Search patients by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    boxShadow: "none",
                    outline: "none",
                    fontSize: "1rem",
                    padding: 0,
                    color: "#2a3f9d",
                    fontWeight: 600,
                    fontFamily: "'Inter Tight', sans-serif",
                  }}
                />
              </div>
            </Form.Group>
          </div>

          {/* Sort and Filter Section */}
          <div
            style={{
              background: "#ffffff",
              padding: "1.5rem 2rem",
              borderRadius: "16px",
              boxShadow: "0 4px 12px rgba(42, 63, 157, 0.08)",
              marginBottom: "1.5rem",
            }}
          >
            <Row className="g-3 align-items-center">
              <Col md={6}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18M7 12h10m-7 6h4" stroke="#4a6cf7" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      Sort By
                    </label>
                    <Form.Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        borderRadius: "10px",
                        border: "2px solid #e2e8f0",
                        padding: "0.75rem 1rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "#2a3f9d",
                        background: "#f8fafc",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#4a6cf7";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(74, 108, 247, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <option value="name">Alphabetical (A-Z)</option>
                      <option value="schedule">Dialysis Schedule</option>
                    </Form.Select>
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="#4a6cf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      Filter by Schedule
                    </label>
                    <Form.Select
                      value={scheduleFilter}
                      onChange={(e) => {
                        setScheduleFilter(e.target.value);
                        setCurrentPage(1); // Reset to first page when filtering
                      }}
                      style={{
                        borderRadius: "10px",
                        border: "2px solid #e2e8f0",
                        padding: "0.75rem 1rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "#2a3f9d",
                        background: "#f8fafc",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#4a6cf7";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(74, 108, 247, 0.1)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <option value="">All Schedules</option>
                      <option value="MWF">MWF (Monday, Wednesday, Friday)</option>
                      <option value="TTHS">TTHS (Tuesday, Thursday, Saturday)</option>
                    </Form.Select>
                  </div>
                </div>
              </Col>
            </Row>
            {(scheduleFilter || sortBy === "schedule") && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                  background: "linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)",
                  borderRadius: "10px",
                  border: "1px solid rgba(74, 108, 247, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#4a6cf7" strokeWidth="2"/>
                  <path d="M12 16v-4m0-4h.01" stroke="#4a6cf7" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <span style={{ color: "#2a3f9d", fontWeight: 700, fontSize: "0.95rem" }}>
                    {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
                  </span>
                  {scheduleFilter && (
                    <span style={{ color: "#64748b", fontSize: "0.9rem", marginLeft: "0.5rem" }}>
                      • Filtered by {scheduleFilter}
                    </span>
                  )}
                </div>
                {scheduleFilter && (
                  <Button
                    size="sm"
                    onClick={() => setScheduleFilter("")}
                    style={{
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      padding: "0.5rem 1rem",
                      border: "none",
                      background: "#4a6cf7",
                      color: "#fff",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#2a3f9d";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#4a6cf7";
                    }}
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Active Patients Table */}
          {!showArchived && (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "20px",
                boxShadow: "0 8px 24px rgba(42, 63, 157, 0.1)",
                overflow: "hidden",
              }}
            >
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" style={{ color: "#4a6cf7" }} />
                  <p style={{ marginTop: "1rem", color: "#64748b", fontWeight: 600 }}>
                    Loading patients...
                  </p>
                </div>
              ) : (
                <>
                  {/* Table for Active */}
                  <div
                    style={{
                      width: "100%",
                      overflowX: "auto",
                    }}
                  >
                    <Table
                      hover
                      responsive
                      className="mb-0"
                      style={{
                        background: "transparent",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        minWidth: 900,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            letterSpacing: "0.3px",
                            textTransform: "uppercase",
                          }}
                        >
                          <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>#</th>
                          <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Patient Name</th>
                          <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Contact Info</th>
                          <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Medical Details</th>
                          <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Dialysis</th>
                          <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>PID #</th>
                          <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Family History</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPatients.map((patient, index) => (
                          <tr
                            key={patient._id}
                            style={{
                              background: index % 2 === 0 ? "#f8fafc" : "#ffffff",
                              transition: "all 0.2s ease",
                              verticalAlign: "middle",
                              cursor: "pointer",
                              borderLeft: "4px solid transparent",
                            }}
                            onClick={() => handleViewPatient(patient)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f0f4ff";
                              e.currentTarget.style.borderLeft = "4px solid #4a6cf7";
                              e.currentTarget.style.transform = "scale(1.005)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = index % 2 === 0 ? "#f8fafc" : "#ffffff";
                              e.currentTarget.style.borderLeft = "4px solid transparent";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <td style={{ padding: "1.25rem 1.5rem", fontWeight: 700, color: "#4a6cf7", fontSize: "1rem", border: "none", fontFamily: "'Inter Tight', sans-serif" }}>
                              {indexOfFirstPatient + index + 1}
                            </td>
                            <td style={{ padding: "1.25rem 1.5rem", border: "none" }}>
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
                                    background: "linear-gradient(135deg, #4a6cf7 0%, #2a3f9d 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    fontWeight: 800,
                                    fontSize: "1.1rem",
                                    flexShrink: 0,
                                    boxShadow: "0 4px 12px rgba(42, 63, 157, 0.2)",
                                    fontFamily: "'Inter Tight', sans-serif",
                                  }}
                                >
                                  {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: "#2a3f9d", fontSize: "1rem", fontFamily: "'Inter Tight', sans-serif" }}>
                                    {`${patient.firstName} ${patient.middleName || ""} ${patient.lastName}`}
                                  </div>
                                  <div style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                                    {new Date(patient.birthday).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} 
                                    <span style={{ 
                                      marginLeft: "0.5rem", 
                                      color: "#94a3b8",
                                      background: "#f1f5f9",
                                      padding: "0.125rem 0.5rem",
                                      borderRadius: "6px",
                                      fontSize: "0.8rem",
                                      fontWeight: 600,
                                    }}>
                                      {Math.floor((new Date() - new Date(patient.birthday)) / (365.25 * 24 * 60 * 60 * 1000))} yrs
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "1.25rem 1.5rem", border: "none" }}>
                              <div style={{ color: "#475569", fontWeight: 500, fontSize: "0.9rem" }}>{patient.email}</div>
                              <div style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>{patient.phone}</div>
                              <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.25rem" }}>{patient.address}</div>
                            </td>
                            <td style={{ padding: "1.25rem 1.5rem", border: "none" }}>
                              <div style={{ fontSize: "0.875rem", lineHeight: "1.6" }}>
                                <div>
                                  <span style={{ fontWeight: 700, color: "#2a3f9d" }}>Blood:</span>{" "}
                                  <span style={{ 
                                    background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                                    padding: "0.125rem 0.5rem",
                                    borderRadius: "6px",
                                    fontWeight: 700,
                                    color: "#dc2626",
                                  }}>
                                    {patient.bloodType}
                                  </span>
                                </div>
                                <div style={{ marginTop: "0.25rem" }}>
                                  <span style={{ fontWeight: 600, color: "#64748b" }}>Ht:</span> {patient.height} cm
                                </div>
                                <div style={{ marginTop: "0.25rem" }}>
                                  <span style={{ fontWeight: 600, color: "#64748b" }}>Wt:</span> {patient.weight} kg
                                </div>
                                <div style={{ marginTop: "0.25rem" }}>
                                  <span style={{ fontWeight: 600, color: "#64748b" }}>Gender:</span> {patient.gender}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "1.25rem 1.5rem", border: "none" }}>
                              <div
                                style={{
                                  background: "linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)",
                                  padding: "0.5rem 0.75rem",
                                  borderRadius: "10px",
                                  border: "1px solid rgba(42, 63, 157, 0.2)",
                                }}
                              >
                                <div style={{ fontWeight: 700, color: "#2a3f9d", fontSize: "0.9rem" }}>
                                  {patient.dialysisSchedule}
                                </div>
                                <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                  {patient.hospital}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "1.25rem 1.5rem", border: "none", fontSize: "0.9rem", color: "#475569", fontWeight: 600 }}>
                              {patient.pidNumber || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>N/A</span>}
                            </td>
                            <td style={{ padding: "1.25rem 1.5rem", border: "none", fontSize: "0.875rem", color: "#64748b" }}>
                              {patient.familyHistory || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>N/A</span>}
                            </td>
                          </tr>
                        ))}
                        {currentPatients.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                textAlign: "center",
                                padding: "3rem",
                                color: "#64748b",
                                fontSize: "1.1rem",
                                background: "#f8fafc",
                              }}
                            >
                              <div style={{ marginBottom: "1rem" }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.3 }}>
                                  <circle cx="12" cy="12" r="10" stroke="#94a3b8" strokeWidth="2"/>
                                  <path d="M12 8v4M12 16h.01" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </div>
                              No patients found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div style={{ padding: "1.5rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                      <Pagination className="mb-0 justify-content-center">
                        <Pagination.Prev
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          style={{
                            borderRadius: "8px",
                            fontWeight: 600,
                            color: currentPage === 1 ? "#cbd5e1" : "#4a6cf7",
                          }}
                        />
                        {[...Array(totalPages)].map((_, index) => (
                          <Pagination.Item
                            key={index + 1}
                            active={currentPage === index + 1}
                            onClick={() => setCurrentPage(index + 1)}
                            style={{
                              borderRadius: "8px",
                              fontWeight: 600,
                              margin: "0 0.25rem",
                            }}
                          >
                            {index + 1}
                          </Pagination.Item>
                        ))}
                        <Pagination.Next
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          style={{
                            borderRadius: "8px",
                            fontWeight: 600,
                            color: currentPage === totalPages ? "#cbd5e1" : "#4a6cf7",
                          }}
                        />
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Archived Patients Modal */}
          <Modal
            show={showArchivedModal}
            onHide={() => setShowArchivedModal(false)}
            size="xl"
            centered
            dialogClassName="custom-modal-dialog"
          >
            <Modal.Header
              closeButton
              style={{
                background: "linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)",
                color: "#fff",
                borderBottom: "none",
                padding: "1.5rem 2rem",
              }}
            >
              <Modal.Title style={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", fontFamily: "'Inter Tight', sans-serif" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "0.75rem", verticalAlign: "middle" }}>
                  <path d="M21 8v13H3V8M1 3h22v5H1V3zm9 5v13m4-13v13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Archived Patients
              </Modal.Title>
            </Modal.Header>
            <Modal.Body
              style={{
                background: "#f8fafc",
                padding: "2rem",
              }}
            >
              <div
                style={{
                  width: "100%",
                  overflowX: "auto",
                  borderRadius: "20px",
                }}
              >
                <Table
                  hover
                  responsive
                  className="mb-0"
                  style={{
                    background: "transparent",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    minWidth: 900,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        letterSpacing: "0.5px",
                        border: "none",
                      }}
                    >
                      <th style={{ border: "none", borderTopLeftRadius: 16, padding: "1.1rem 1.2rem" }}>#</th>
                      <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Patient Name</th>
                      <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Contact Info</th>
                      <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Medical Details</th>
                      <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Dialysis</th>
                      <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>PID #</th>
                      <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Family History</th>
                      <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedPatients.length > 0 ? (
                      archivedPatients.map((patient, index) => (
                        <tr
                          key={patient._id}
                          style={{
                            background: index % 2 === 0 ? "#f7faff" : "#fff",
                            borderRadius: 14,
                            boxShadow: "0 2px 8px rgba(42,63,157,0.03)",
                            transition: "background 0.2s",
                            verticalAlign: "middle",
                          }}
                        >
                          <td style={{ padding: "1.1rem 1.2rem", fontWeight: 600, color: "#4a6cf7", fontSize: "1.05rem", border: "none" }}>
                            {index + 1}
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div style={{ fontWeight: 700, color: "#263a99", fontSize: "1.08rem" }}>
                              {`${patient.firstName} ${patient.middleName || ""} ${patient.lastName}`}
                            </div>
                            <div style={{ color: "#64748b", fontSize: "0.97rem", marginTop: 2 }}>
                              DOB: {new Date(patient.birthday).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} 
                              <span style={{ marginLeft: 8, color: "#a0aec0" }}>
                                ({Math.floor((new Date() - new Date(patient.birthday)) / (365.25 * 24 * 60 * 60 * 1000))} yrs)
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div style={{ color: "#374151", fontWeight: 500 }}>{patient.email}</div>
                            <div style={{ color: "#374151" }}>{patient.phone}</div>
                            <div style={{ color: "#a0aec0", fontSize: "0.97rem" }}>{patient.address}</div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div>
                              <span style={{ fontWeight: 600, color: "#4a6cf7" }}>Blood:</span> {patient.bloodType}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: "#4a6cf7" }}>Ht:</span> {patient.height} cm
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: "#4a6cf7" }}>Wt:</span> {patient.weight} kg
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: "#4a6cf7" }}>Gender:</span> {patient.gender}
                            </div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div>
                              <span style={{ fontWeight: 600, color: "#263a99" }}>Schedule:</span> {patient.dialysisSchedule}
                            </div>
                            <div style={{ color: "#a0aec0", fontSize: "0.97rem" }}>
                              {patient.hospital}
                            </div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            {patient.pidNumber || <span style={{ color: "#a0aec0" }}>N/A</span>}
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            {patient.familyHistory || <span style={{ color: "#a0aec0" }}>N/A</span>}
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <Button
                              variant="success"
                              size="sm"
                              style={{ fontWeight: 600, borderRadius: 8 }}
                              onClick={() => handleRestore(patient._id)}
                            >
                              Restore
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "#64748b",
                            fontSize: "1.1rem",
                            background: "#f9fafb",
                          }}
                        >
                          No archived patients found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Modal.Body>
          </Modal>

        {/* Edit Patient Modal */}
        <Modal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          size="lg"
          centered
          dialogClassName="modern-modal"
        >
          <div style={{
            borderRadius: "20px",
            overflow: "hidden",
            border: "none",
          }}>
            <Modal.Header
              closeButton
              style={{
                background: "linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)",
                color: "#fff",
                border: "none",
                padding: "1.5rem 2rem",
              }}
            >
              <Modal.Title style={{ 
                fontWeight: 800, 
                fontSize: "1.5rem", 
                color: "#fff",
                fontFamily: "'Inter Tight', sans-serif"
              }}>
                Edit Patient Information
              </Modal.Title>
            </Modal.Header>
            <Modal.Body
              style={{
                background: "#f8fafc",
                padding: "2rem",
                border: "none",
              }}
            >
            {editPatient && (
              <Form onSubmit={handleEditSubmit}>
                <Row>
                  <Col md={4}>
                    <Form.Group controlId="firstName" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>First Name *</Form.Label>
                      <Form.Control
                        name="firstName"
                        value={editPatient.firstName || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="middleName" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Middle Name</Form.Label>
                      <Form.Control
                        name="middleName"
                        value={editPatient.middleName || ""}
                        onChange={handleInputChange}
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="lastName" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Last Name *</Form.Label>
                      <Form.Control
                        name="lastName"
                        value={editPatient.lastName || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group controlId="birthday" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Birthday *</Form.Label>
                      <Form.Control
                        type="date"
                        name="birthday"
                        value={editPatient.birthday || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="bloodType" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Blood Type *</Form.Label>
                      <Form.Select
                        name="bloodType"
                        value={editPatient.bloodType || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      >
                        <option value="">Select Blood Type</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="I don't know">I don't know</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group controlId="gender" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Gender *</Form.Label>
                      <Form.Select
                        name="gender"
                        value={editPatient.gender || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="email" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={editPatient.email || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="phone" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Phone *</Form.Label>
                      <Form.Control
                        name="phone"
                        value={editPatient.phone || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group controlId="address" className="mb-3">
                  <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Address *</Form.Label>
                  <Form.Control
                    name="address"
                    value={editPatient.address || ""}
                    onChange={handleInputChange}
                    required
                    style={{
                      borderRadius: 10,
                      border: "1px solid #e0e7ef",
                      background: "#fff",
                      fontWeight: 500,
                      color: "#263a99",
                      boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                    }}
                  />
                </Form.Group>

                <Row>
                  <Col md={4}>
                    <Form.Group controlId="height" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Height (cm) *</Form.Label>
                      <Form.Control
                        type="number"
                        name="height"
                        value={editPatient.height || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="weight" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Weight (kg) *</Form.Label>
                      <Form.Control
                        type="number"
                        name="weight"
                        value={editPatient.weight || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="hospital" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Hospital *</Form.Label>
                      <Form.Control
                        name="hospital"
                        value={editPatient.hospital || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="mt-4 mb-3" style={{ color: "#4a6cf7", fontWeight: 700 }}>Emergency Contact</h5>
                <Row>
                  <Col md={4}>
                    <Form.Group controlId="emergencyName" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Name *</Form.Label>
                      <Form.Control
                        name="name"
                        value={editPatient.emergencyContact?.name || ""}
                        onChange={handleEmergencyContactChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="emergencyRelationship" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Relationship *</Form.Label>
                      <Form.Control
                        name="relationship"
                        value={editPatient.emergencyContact?.relationship || ""}
                        onChange={handleEmergencyContactChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="emergencyPhone" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Phone *</Form.Label>
                      <Form.Control
                        name="phone"
                        value={editPatient.emergencyContact?.phone || ""}
                        onChange={handleEmergencyContactChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="mt-4 mb-3" style={{ color: "#4a6cf7", fontWeight: 700 }}>Dialysis Information</h5>
                <Row>
                  <Col md={6}>
                    <Form.Group controlId="dialysisSchedule" className="mb-3">
                      <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Schedule *</Form.Label>
                      <Form.Select
                        name="dialysisSchedule"
                        value={editPatient.dialysisSchedule || ""}
                        onChange={handleInputChange}
                        required
                        style={{
                          borderRadius: 10,
                          border: "1px solid #e0e7ef",
                          background: "#fff",
                          fontWeight: 500,
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                        }}
                      >
                        <option value="">Select</option>
                        <option value="MWF">Monday, Wednesday, Friday</option>
                        <option value="TTHS">Tuesday, Thursday, Saturday</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group controlId="allergies" className="mb-3">
                  <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Allergies</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="allergies"
                    value={editPatient.allergies?.join(", ") || ""}
                    onChange={(e) =>
                      setEditPatient({
                        ...editPatient,
                        allergies: e.target.value
                          .split(",")
                          .map((item) => item.trim()),
                      })
                    }
                    style={{
                      borderRadius: 10,
                      border: "1px solid #e0e7ef",
                      background: "#fff",
                      fontWeight: 500,
                      color: "#263a99",
                      boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="currentMedications" className="mb-3">
                  <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Current Medications</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="currentMedications"
                    value={editPatient.currentMedications?.join(", ") || ""}
                    onChange={(e) =>
                      setEditPatient({
                        ...editPatient,
                        currentMedications: e.target.value
                          .split(",")
                          .map((item) => item.trim()),
                      })
                    }
                    style={{
                      borderRadius: 10,
                      border: "1px solid #e0e7ef",
                      background: "#fff",
                      fontWeight: 500,
                      color: "#263a99",
                      boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                    }}
                  />
                </Form.Group>

                <Form.Group controlId="medicalHistory" className="mb-3">
                  <Form.Label style={{ color: "#263a99", fontWeight: 600 }}>Medical History</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="medicalHistory"
                    value={editPatient.medicalHistory || ""}
                    onChange={handleInputChange}
                    style={{
                      borderRadius: 10,
                      border: "1px solid #e0e7ef",
                      background: "#fff",
                      fontWeight: 500,
                      color: "#263a99",
                      boxShadow: "0 1px 4px rgba(42,63,157,0.04)",
                    }}
                  />
                </Form.Group>

                <div className="d-flex justify-content-end mt-4">
                  <Button
                    variant="secondary"
                    className="me-2"
                    style={{
                      borderRadius: 8,
                      fontWeight: 600,
                      background: "#e0e7ef",
                      color: "#263a99",
                      border: "none",
                      boxShadow: "0 1px 4px rgba(42,63,157,0.07)",
                      transition: "background 0.2s, color 0.2s",
                    }}
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    style={{
                      borderRadius: 8,
                      fontWeight: 600,
                      background: "linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)",
                      border: "none",
                      boxShadow: "0 1px 4px rgba(74,108,247,0.07)",
                      transition: "background 0.2s",
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </Form>
            )}
          </Modal.Body>
          </div>
        </Modal>

        {/* Archive Modal */}
        <Modal
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirm Archive</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to archive this patient? You can restore them later from the Archived Patients tab.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="warning" onClick={confirmArchive}>
              Archive Patient
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Patient View Modal */}
        <Modal
          show={showViewModal}
          onHide={() => setShowViewModal(false)}
          size="lg"
          centered
          dialogClassName="custom-modal-dialog"
        >
          <Modal.Header
            closeButton
            style={{
              background: "linear-gradient(135deg, #2a3f9d 0%, #4a6cf7 100%)",
              color: "#fff",
              borderBottom: "none",
              padding: "1.5rem 2rem",
            }}
          >
            <Modal.Title style={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", fontFamily: "'Inter Tight', sans-serif" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "0.75rem", verticalAlign: "middle" }}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Patient Details
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            style={{
              background: "#f8fafc",
              padding: "2rem",
            }}
          >
            {viewPatient && (
              <div style={{ fontSize: "0.95rem", color: "#475569" }}>
                {/* Patient Avatar */}
                <div style={{ 
                  textAlign: "center", 
                  marginBottom: "2rem",
                  paddingBottom: "1.5rem",
                  borderBottom: "2px solid #e2e8f0"
                }}>
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "20px",
                      background: "linear-gradient(135deg, #4a6cf7 0%, #2a3f9d 100%)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "2rem",
                      marginBottom: "1rem",
                      boxShadow: "0 8px 24px rgba(42, 63, 157, 0.3)",
                      fontFamily: "'Inter Tight', sans-serif",
                    }}
                  >
                    {viewPatient.firstName?.charAt(0)}{viewPatient.lastName?.charAt(0)}
                  </div>
                  <h4 style={{ 
                    fontWeight: 800, 
                    color: "#2a3f9d", 
                    marginBottom: "0.5rem",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: "1.5rem"
                  }}>
                    {viewPatient.firstName} {viewPatient.middleName} {viewPatient.lastName}
                  </h4>
                  <div style={{
                    display: "inline-block",
                    background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                    padding: "0.375rem 1rem",
                    borderRadius: "8px",
                    fontWeight: 700,
                    color: "#dc2626",
                    fontSize: "0.95rem"
                  }}>
                    {viewPatient.bloodType}
                  </div>
                </div>

                {/* Info Grid */}
                <Row className="g-4">
                  <Col md={6}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Birthday</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {new Date(viewPatient.birthday).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Age</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {Math.floor((new Date() - new Date(viewPatient.birthday)) / (365.25 * 24 * 60 * 60 * 1000))} years old
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem", wordBreak: "break-word" }}>
                        {viewPatient.email}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Phone</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.phone}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Gender</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.gender}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Hospital</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.hospital}
                      </div>
                    </div>
                  </Col>
                  <Col md={12}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Address</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.address}
                      </div>
                    </div>
                  </Col>
                </Row>

                <h5 className="mt-4 mb-3" style={{ 
                  color: "#2a3f9d", 
                  fontWeight: 800, 
                  fontSize: "1.1rem",
                  fontFamily: "'Inter Tight', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" stroke="#4a6cf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Medical Information
                </h5>
                <Row className="g-3">
                  <Col md={4}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Height</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.height} cm
                      </div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Weight</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.weight} kg
                      </div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Dialysis Schedule</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.dialysisSchedule}
                      </div>
                    </div>
                  </Col>
                  <Col md={12}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Allergies</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {Array.isArray(viewPatient.allergies)
                          ? viewPatient.allergies.join(", ") || "None"
                          : viewPatient.allergies || "None"}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Current Medications</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {Array.isArray(viewPatient.currentMedications)
                          ? viewPatient.currentMedications.join(", ") || "None"
                          : viewPatient.currentMedications || "None"}
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Medical History</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.medicalHistory || "None"}
                      </div>
                    </div>
                  </Col>
                </Row>

                <h5 className="mt-4 mb-3" style={{ 
                  color: "#2a3f9d", 
                  fontWeight: 800, 
                  fontSize: "1.1rem",
                  fontFamily: "'Inter Tight', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#4a6cf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Emergency Contact
                </h5>
                <Row className="g-3">
                  <Col md={4}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.emergencyContact?.name || "N/A"}
                      </div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Relationship</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.emergencyContact?.relationship || "N/A"}
                      </div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div style={{ 
                      background: "#fff", 
                      padding: "1rem 1.25rem", 
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Phone</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewPatient.emergencyContact?.phone || "N/A"}
                      </div>
                    </div>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end mt-4" style={{ gap: "0.75rem", paddingTop: "1.5rem", borderTop: "2px solid #e2e8f0" }}>
                  {!showArchived && (
                    <>
                      <Button
                        style={{
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                          border: "none",
                          color: "#fff",
                          boxShadow: "0 4px 12px rgba(6, 182, 212, 0.2)",
                          transition: "all 0.2s ease",
                          padding: "0.75rem 1.25rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                        onClick={() => {
                          setShowViewModal(false);
                          handleEditPatient(viewPatient);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(6, 182, 212, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(6, 182, 212, 0.2)";
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Edit
                      </Button>
                      {isSuperAdmin && (
                        <Button
                          style={{
                            borderRadius: "10px",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                            border: "none",
                            color: "#fff",
                            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.2)",
                            transition: "all 0.2s ease",
                            padding: "0.75rem 1.25rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                          onClick={() => {
                            setShowViewModal(false);
                            handleChangePasswordClick(viewPatient);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 6px 16px rgba(139, 92, 246, 0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.2)";
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 11V7a5 5 0 0110 0v4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Change Password
                        </Button>
                      )}
                      <Button
                        style={{
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                          border: "none",
                          color: "#fff",
                          boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                          transition: "all 0.2s ease",
                          padding: "0.75rem 1.25rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                        onClick={() => {
                          setShowViewModal(false);
                          handleArchiveClick(viewPatient._id);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(245, 158, 11, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.2)";
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 8v13H3V8M1 3h22v5H1V3zm9 5v13m4-13v13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Archive
                      </Button>
                      <Button
                        style={{
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          border: "none",
                          color: "#fff",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                          transition: "all 0.2s ease",
                          padding: "0.75rem 1.25rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                        onClick={() => exportSinglePatientPDF(viewPatient)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 185, 129, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.2)";
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Export PDF
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>

        {/* Export Modal */}
        <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Export Patients to PDF</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Dialysis Schedule</Form.Label>
                <Form.Select
                  value={exportSchedule}
                  onChange={e => setExportSchedule(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="MWF">Monday, Wednesday, Friday</option>
                  <option value="TTHS">Tuesday, Thursday, Saturday</option>
                </Form.Select>
              </Form.Group>
            </Form>
            <div style={{ fontSize: "0.97rem", color: "#64748b" }}>
              <b>{getExportFilteredPatients().length}</b> patients will be exported.
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={() => {
                exportPatientsPDF(getExportFilteredPatients());
                setShowExportModal(false);
              }}
              disabled={getExportFilteredPatients().length === 0}
            >
              Export PDF
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Change Password Modal - Super Admin Only */}
        {isSuperAdmin && (
          <Modal 
            show={showChangePasswordModal} 
            onHide={() => {
              setShowChangePasswordModal(false);
              setPasswordChangePatient(null);
              setNewPassword("");
              setConfirmPassword("");
              setPasswordError("");
            }} 
            centered
          >
            <Modal.Header 
              closeButton
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                color: "#fff",
                borderBottom: "none",
                padding: "1.5rem 2rem",
              }}
            >
              <Modal.Title style={{ 
                fontWeight: 800, 
                fontSize: "1.4rem", 
                color: "#fff",
                fontFamily: "'Inter Tight', sans-serif",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Change Patient Password
              </Modal.Title>
            </Modal.Header>
            <Modal.Body
              style={{
                background: "#f8fafc",
                padding: "2rem",
              }}
            >
              {passwordChangePatient && (
                <>
                  <div style={{
                    background: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
                    padding: "1rem 1.25rem",
                    borderRadius: "12px",
                    marginBottom: "1.5rem",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                  }}>
                    <div style={{ 
                      fontSize: "0.85rem", 
                      color: "#7c3aed", 
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      Patient
                    </div>
                    <div style={{ 
                      fontSize: "1.1rem", 
                      fontWeight: 700, 
                      color: "#2a3f9d",
                      fontFamily: "'Inter Tight', sans-serif"
                    }}>
                      {passwordChangePatient.firstName} {passwordChangePatient.middleName} {passwordChangePatient.lastName}
                    </div>
                    <div style={{ 
                      fontSize: "0.9rem", 
                      color: "#64748b",
                      marginTop: "0.25rem"
                    }}>
                      {passwordChangePatient.email}
                    </div>
                  </div>

                  <Form onSubmit={handlePasswordChange}>
                    <Form.Group className="mb-3">
                      <Form.Label style={{ 
                        color: "#2a3f9d", 
                        fontWeight: 700,
                        fontSize: "0.95rem"
                      }}>
                        New Password *
                      </Form.Label>
                      <Form.Control
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        style={{
                          borderRadius: "10px",
                          border: "2px solid #e2e8f0",
                          padding: "0.75rem 1rem",
                          fontSize: "0.95rem",
                          fontWeight: 500,
                          transition: "all 0.2s ease",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8b5cf6";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                      <Form.Text style={{ 
                        color: "#64748b",
                        fontSize: "0.85rem",
                        marginTop: "0.5rem",
                        display: "block"
                      }}>
                        Password must be at least 6 characters long
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label style={{ 
                        color: "#2a3f9d", 
                        fontWeight: 700,
                        fontSize: "0.95rem"
                      }}>
                        Confirm Password *
                      </Form.Label>
                      <Form.Control
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        style={{
                          borderRadius: "10px",
                          border: "2px solid #e2e8f0",
                          padding: "0.75rem 1rem",
                          fontSize: "0.95rem",
                          fontWeight: 500,
                          transition: "all 0.2s ease",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#8b5cf6";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </Form.Group>

                    {passwordError && (
                      <div style={{
                        background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
                        padding: "0.75rem 1rem",
                        borderRadius: "10px",
                        border: "1px solid rgba(220, 38, 38, 0.2)",
                        marginBottom: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                          <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span style={{ 
                          color: "#dc2626", 
                          fontWeight: 600,
                          fontSize: "0.9rem"
                        }}>
                          {passwordError}
                        </span>
                      </div>
                    )}

                    <div style={{
                      background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                      padding: "1rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      marginTop: "1rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem"
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "0.125rem" }}>
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        <div style={{ 
                          color: "#92400e", 
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          marginBottom: "0.25rem"
                        }}>
                          Super Admin Action
                        </div>
                        <div style={{ 
                          color: "#78350f", 
                          fontSize: "0.85rem",
                          lineHeight: "1.5"
                        }}>
                          This action will immediately change the patient's password. The patient will need to use this new password to log in.
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end mt-4" style={{ gap: "0.75rem", paddingTop: "1rem" }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowChangePasswordModal(false);
                          setPasswordChangePatient(null);
                          setNewPassword("");
                          setConfirmPassword("");
                          setPasswordError("");
                        }}
                        style={{
                          borderRadius: "10px",
                          fontWeight: 700,
                          padding: "0.75rem 1.5rem",
                          fontSize: "0.95rem",
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        style={{
                          borderRadius: "10px",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                          border: "none",
                          color: "#fff",
                          boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
                          transition: "all 0.2s ease",
                          padding: "0.75rem 1.5rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(139, 92, 246, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.3)";
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Change Password
                      </Button>
                    </div>
                  </Form>
                </>
              )}
            </Modal.Body>
          </Modal>
        )}
        </div>
      </div>
      </div>
    </>
  );
};

export default PatientsPage;
