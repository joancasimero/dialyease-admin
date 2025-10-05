import React, { useEffect, useState } from "react";
import axios from "axios";
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

  useEffect(() => {
    fetchPatients();
    fetchArchivedPatients(); 
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/patients");
      setPatients((response.data.data || response.data).filter(p => p.approved));
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedPatients = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/patients/archived");
      setArchivedPatients(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error("Error fetching archived patients:", error);
      setArchivedPatients([]);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    `${patient.firstName} ${patient.middleName || ""} ${patient.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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
      const response = await axios.put(
        `http://localhost:5000/api/patients/${editPatient._id}`,
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
      await axios.delete(
        `http://localhost:5000/api/patients/${deletePatientId}`
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
      await axios.put(`http://localhost:5000/api/patients/${id}/restore`);
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
      await axios.delete(
        `http://localhost:5000/api/patients/${deletePatientId}`
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
      const response = await fetch('http://localhost:5000/api/patients/export/pdf', {
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
      const response = await fetch('http://localhost:5000/api/patients/export/pdf', {
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

  return (
    <div
      style={{
        background: "linear-gradient(to right, #e6f0ff, #f9fbfd)",
        minHeight: "100vh",
        padding: "40px 20px",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <div style={{ marginLeft: 240 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1.5rem",
              marginBottom: "2.2rem",
              marginTop: "0.5rem",
            }}
          >
            <h2
              className="mb-0 fw-bold"
              style={{
                fontSize: "2.3rem",
                fontWeight: 800,
                letterSpacing: "-1px",
                color: "#263a99",
                lineHeight: 1.1,
                background: "linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: "inline-block",
                textShadow: "0 2px 12px rgba(42,63,157,0.08)",
                borderRadius: "12px",
                padding: "0.2rem 1.2rem",
                boxShadow: "0 4px 18px rgba(42,63,157,0.07)",
                letterSpacing: "0.5px",
                marginBottom: 0,
              }}
            >
              Patient List
            </h2>
            <div style={{ flex: 1, maxWidth: 400, minWidth: 320 }}>
              <Form.Group controlId="search" style={{ marginBottom: 0 }}>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    background: "#f4f6fb",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(42,63,157,0.05)",
                    border: "1px solid #e0e7ef",
                    padding: "2px 12px 2px 0",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  <span
                    style={{
                      fontSize: "1.25rem",
                      color: "#4a6cf7",
                      marginLeft: 14,
                      marginRight: 8,
                      opacity: 0.85,
                      pointerEvents: "none",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                        stroke="#4a6cf7"
                        strokeWidth="2"
                      />
                      <path
                        stroke="#4a6cf7"
                        strokeWidth="2"
                        strokeLinecap="round"
                        d="M20 20l-3.5-3.5"
                      />
                    </svg>
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Search by patient name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      border: "none",
                      background: "transparent",
                      boxShadow: "none",
                      outline: "none",
                      fontSize: "1.08rem",
                      padding: "10px 8px 10px 0",
                      borderRadius: "12px",
                      color: "#263a99",
                      fontWeight: 500,
                      width: "100%",
                    }}
                  />
                </div>
              </Form.Group>
              {}
              <div style={{ height: "0.8rem" }} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  marginTop: "0.5rem",
                }}
              >
                <Button
                  variant="primary"
                  onClick={() => setShowArchivedModal(true)}
                  style={{
                    fontWeight: 600,
                    borderRadius: 8,
                    background: "linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)",
                    border: "none",
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(74,108,247,0.10)",
                    padding: "6px 18px",
                    fontSize: "1rem",
                    transition: "background 0.2s",
                  }}
                >
                  <i className="bi bi-archive" style={{ marginRight: 6 }}></i>
                  Archived Patients
                </Button>
                <Button
                  variant="success"
                  style={{
                    fontWeight: 600,
                    borderRadius: 8,
                    background: "linear-gradient(90deg, #22c55e 60%, #4ade80 100%)",
                    border: "none",
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(34,197,94,0.10)",
                    padding: "6px 18px",
                    fontSize: "1rem",
                    transition: "background 0.2s",
                  }}
                  onClick={() => setShowExportModal(true)}
                >
                  <i className="bi bi-file-earmark-pdf" style={{ marginRight: 6 }}></i>
                  Export PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Active Patients Table */}
          {!showArchived && (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "20px",
                boxShadow: "0 10px 25px rgba(42,63,157,0.08)",
                padding: "0",
                overflow: "hidden",
              }}
            >
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : (
                <>
                  {/* Table for Active */}
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
                        </tr>
                      </thead>
                      <tbody>
                        {currentPatients.map((patient, index) => (
                          <tr
                            key={patient._id}
                            style={{
                              background: index % 2 === 0 ? "#f7faff" : "#fff",
                              borderRadius: 14,
                              boxShadow: "0 2px 8px rgba(42,63,157,0.03)",
                              transition: "background 0.2s",
                              verticalAlign: "middle",
                              cursor: "pointer",
                            }}
                            onClick={() => handleViewPatient(patient)}
                          >
                            <td style={{ padding: "1.1rem 1.2rem", fontWeight: 600, color: "#4a6cf7", fontSize: "1.05rem", border: "none" }}>
                              {indexOfFirstPatient + index + 1}
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
                          </tr>
                        ))}
                        {currentPatients.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                textAlign: "center",
                                padding: "2rem",
                                color: "#64748b",
                                fontSize: "1.1rem",
                                background: "#f9fafb",
                              }}
                            >
                              No patients found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                  <Pagination className="mt-4 justify-content-center">
                    <Pagination.Prev
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                    {[...Array(totalPages)].map((_, index) => (
                      <Pagination.Item
                        key={index + 1}
                        active={currentPage === index + 1}
                        onClick={() => setCurrentPage(index + 1)}
                      >
                        {index + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
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
          >
            <Modal.Header
              closeButton
              style={{
                background: "linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)",
                color: "#fff",
                borderTopLeftRadius: "1rem",
                borderTopRightRadius: "1rem",
                borderBottom: "none",
                boxShadow: "0 2px 8px rgba(42,63,157,0.07)",
              }}
            >
              <Modal.Title style={{ fontWeight: 700, fontSize: "1.4rem", color: "#fff" }}>
                Archived Patients
              </Modal.Title>
            </Modal.Header>
            <Modal.Body
              style={{
                background: "#f7faff",
                borderBottomLeftRadius: "1rem",
                borderBottomRightRadius: "1rem",
                padding: "2rem 2.5rem",
                boxShadow: "0 2px 8px rgba(42,63,157,0.04)",
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
        >
          <Modal.Header
            closeButton
            style={{
              background: "linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)",
              color: "#fff",
              borderTopLeftRadius: "1rem",
              borderTopRightRadius: "1rem",
              borderBottom: "none",
              boxShadow: "0 2px 8px rgba(42,63,157,0.07)",
            }}
          >
            <Modal.Title style={{ fontWeight: 700, fontSize: "1.4rem", color: "#fff" }}>
              Edit Patient Information
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            style={{
              background: "#f7faff",
              borderBottomLeftRadius: "1rem",
              borderBottomRightRadius: "1rem",
              padding: "2rem 2.5rem",
              boxShadow: "0 2px 8px rgba(42,63,157,0.04)",
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
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
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
        >
          <Modal.Header
            closeButton
            style={{
              background: "linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)",
              color: "#fff",
              borderTopLeftRadius: "1rem",
              borderTopRightRadius: "1rem",
              borderBottom: "none",
              boxShadow: "0 2px 8px rgba(42,63,157,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Modal.Title style={{ fontWeight: 700, fontSize: "1.4rem", color: "#fff" }}>
              Patient Details
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            style={{
              background: "#f7faff",
              borderBottomLeftRadius: "1rem",
              borderBottomRightRadius: "1rem",
              padding: "2rem 2.5rem",
              boxShadow: "0 2px 8px rgba(42,63,157,0.04)",
            }}
          >
            {viewPatient && (
              <div style={{ fontSize: "1.08rem", color: "#263a99" }}>
                <Row>
                  <Col md={4} className="mb-3">
                    <strong>Name</strong>
                    <div style={{ fontWeight: 600, fontSize: "1.15rem" }}>
                      {viewPatient.firstName} {viewPatient.middleName} {viewPatient.lastName}
                    </div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <strong>Birthday</strong>
                    <div>
                      {new Date(viewPatient.birthday).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <strong>Age</strong>
                    <div>
                      {Math.floor((new Date() - new Date(viewPatient.birthday)) / (365.25 * 24 * 60 * 60 * 1000))} yrs
                    </div>
                  </Col>
                </Row>
                <Row>
                  <Col md={4} className="mb-3">
                    <strong>Email</strong>
                    <div>{viewPatient.email}</div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <strong>Phone</strong>
                    <div>{viewPatient.phone}</div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <strong>Gender</strong>
                    <div>{viewPatient.gender}</div>
                  </Col>
                </Row>
                <Row>
                  <Col md={12} className="mb-3">
                    <strong>Address</strong>
                    <div>{viewPatient.address}</div>
                  </Col>
                </Row>
                <Row>
                  <Col md={3} className="mb-3">
                    <strong>Blood Type</strong>
                    <div>{viewPatient.bloodType}</div>
                  </Col>
                  <Col md={3} className="mb-3">
                    <strong>Height</strong>
                    <div>{viewPatient.height} cm</div>
                  </Col>
                  <Col md={3} className="mb-3">
                    <strong>Weight</strong>
                    <div>{viewPatient.weight} kg</div>
                  </Col>
                  <Col md={3} className="mb-3">
                    <strong>Hospital</strong>
                    <div>{viewPatient.hospital}</div>
                  </Col>
                </Row>
                <h5 className="mt-4 mb-3" style={{ color: "#4a6cf7", fontWeight: 700 }}>
                  Dialysis Information
                </h5>
                <Row>
                  <Col md={12} className="mb-3">
                    <strong>Dialysis Schedule</strong>
                    <div>{viewPatient.dialysisSchedule}</div>
                  </Col>
                </Row>
                <Row>
                  <Col md={12} className="mb-3">
                    <strong>Allergies</strong>
                    <div>
                      {Array.isArray(viewPatient.allergies)
                        ? viewPatient.allergies.join(", ")
                        : viewPatient.allergies}
                    </div>
                  </Col>
                </Row>
                <Row>
                  <Col md={6} className="mb-3">
                    <strong>Current Medications</strong>
                    <div>
                      {Array.isArray(viewPatient.currentMedications)
                        ? viewPatient.currentMedications.join(", ")
                        : viewPatient.currentMedications}
                    </div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <strong>Medical History</strong>
                    <div>{viewPatient.medicalHistory}</div>
                  </Col>
                </Row>
                <h5 className="mt-4 mb-3" style={{ color: "#4a6cf7", fontWeight: 700 }}>
                  Emergency Contact
                </h5>
                <Row>
                  <Col md={4} className="mb-3">
                    <strong>Name</strong>
                    <div>{viewPatient.emergencyContact?.name}</div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <strong>Relationship</strong>
                    <div>{viewPatient.emergencyContact?.relationship}</div>
                  </Col>
                  <Col md={4} className="mb-3">
                    <strong>Phone</strong>
                    <div>{viewPatient.emergencyContact?.phone}</div>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end mt-4" style={{ gap: 8 }}>
                  {!showArchived && (
                    <>
                      <Button
                        style={{
                          borderRadius: 8,
                          fontWeight: 600,
                          background: "#38bdf8", 
                          border: "none",
                          color: "#fff",
                          boxShadow: "0 1px 4px rgba(56,189,248,0.12)",
                          transition: "background 0.2s",
                          padding: "6px 18px",
                          fontSize: "1rem",
                        }}
                        className="me-2"
                        onClick={() => {
                          setShowViewModal(false);
                          handleEditPatient(viewPatient);
                        }}
                      >
                        <i className="bi bi-pencil-square" style={{ marginRight: 6 }}></i>
                        Edit
                      </Button>
                      <Button
                        style={{
                          borderRadius: 8,
                          fontWeight: 600,
                          background: "#fbbf24", 
                          border: "none",
                          color: "#263a99",
                          boxShadow: "0 1px 4px rgba(251,191,36,0.07)",
                          transition: "background 0.2s",
                          padding: "6px 18px",
                          fontSize: "1rem",
                        }}
                        className="me-2"
                        onClick={() => {
                          setShowViewModal(false);
                          handleArchiveClick(viewPatient._id);
                        }}
                      >
                        <i className="bi bi-archive" style={{ marginRight: 6 }}></i>
                        Archive
                      </Button>
                      <Button
                        style={{
                          borderRadius: 8,
                          fontWeight: 600,
                          background: "#22c55e", 
                          border: "none",
                          color: "#fff",
                          boxShadow: "0 1px 4px rgba(34,197,94,0.10)",
                          transition: "background 0.2s",
                          padding: "6px 18px",
                          fontSize: "1rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        onClick={() => exportSinglePatientPDF(viewPatient)}
                      >
                        <i className="bi bi-file-earmark-pdf"></i>
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
        </div>
      </div>
    </div>
  );
};

export default PatientsPage;
