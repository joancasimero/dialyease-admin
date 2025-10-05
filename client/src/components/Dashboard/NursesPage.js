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
  Container,
  Card,
  Alert,
  Dropdown,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const NursesPage = () => {
  const [nurses, setNurses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [nursesPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewNurse, setViewNurse] = useState(null);
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchNurses();
  }, [showArchived]);

  const fetchNurses = async () => {
    try {
      const endpoint = showArchived 
        ? "http://localhost:5000/api/nurses/archived"
        : "http://localhost:5000/api/nurses";
      const res = await axios.get(endpoint);
      
      if (showArchived) {
        setNurses(res.data.data || res.data);
      } else {
        setNurses(res.data.filter(nurse => nurse.approved));
      }
    } catch (err) {
      setError("Failed to fetch nurses.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveNurse = async (id) => {
    if (window.confirm('Are you sure you want to archive this nurse?')) {
      try {
        await axios.delete(`http://localhost:5000/api/nurses/${id}`);
        fetchNurses();
      } catch (err) {
        alert('Failed to archive nurse');
      }
    }
  };

  const handleRestoreNurse = async (id) => {
    if (window.confirm('Are you sure you want to restore this nurse?')) {
      try {
        await axios.put(`http://localhost:5000/api/nurses/${id}/restore`);
        fetchNurses();
      } catch (err) {
        alert('Failed to restore nurse');
      }
    }
  };

  const filteredNurses = nurses.filter((nurse) =>
    `${nurse.firstName} ${nurse.middleName || ""} ${nurse.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const indexOfLastNurse = currentPage * nursesPerPage;
  const indexOfFirstNurse = indexOfLastNurse - nursesPerPage;
  const currentNurses = filteredNurses.slice(
    indexOfFirstNurse,
    indexOfLastNurse
  );
  const totalPages = Math.ceil(filteredNurses.length / nursesPerPage);

  const handleViewNurse = (nurse) => {
    setViewNurse(nurse);
    setShowViewModal(true);
  };

  const exportNursesPDF = async () => {
    try {
      const nursesToExport = showArchived ? 
        await axios.get('http://localhost:5000/api/nurses/archived').then(res => res.data.data || res.data) :
        nurses;
        
      const response = await fetch('http://localhost:5000/api/nurses/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nurses: nursesToExport }),
      });
      if (!response.ok) {
        alert('Failed to export PDF');
        return;
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = showArchived ? 'archived_nurses_list.pdf' : 'nurses_list.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export PDF');
    }
  };

  const exportSingleNursePDF = async (nurse) => {
    try {
      const response = await fetch('http://localhost:5000/api/nurses/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nurses: [nurse] }),
      });
      if (!response.ok) {
        alert('Failed to export PDF');
        return;
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${nurse.lastName || 'nurse'}_${nurse.firstName || ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export PDF');
    }
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
              {showArchived ? 'Archived Nurses' : 'Nurses List'}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Button
                variant={showArchived ? "outline-primary" : "primary"}
                onClick={() => setShowArchived(!showArchived)}
                style={{ fontWeight: 600 }}
              >
                {showArchived ? 'Show Active' : 'Show Archived'}
              </Button>
              <Form.Group
                controlId="search"
                style={{
                  marginBottom: 0,
                  minWidth: 320,
                  flex: 1,
                  maxWidth: 400,
                }}
              >
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
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
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
                    placeholder="Search by nurse name..."
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
              <Button
                variant="outline-success"
                style={{ fontWeight: 600 }}
                onClick={exportNursesPDF}
              >
                <i className="bi bi-file-earmark-pdf"></i> Export PDF
              </Button>
            </div>
          </div>

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
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : (
              <>
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
                          background:
                            "linear-gradient(90deg, #263a99 60%, #4a6cf7 100%)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "1.05rem",
                          letterSpacing: "0.5px",
                          border: "none",
                        }}
                      >
                        <th style={{ border: "none", borderTopLeftRadius: 16, padding: "1.1rem 1.2rem" }}>#</th>
                        <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Nurse Name</th>
                        <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Email</th>
                        <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Mobile</th>
                        <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Gender</th>
                        <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Birthday</th>
                        <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>License #</th>
                        <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Shift</th>
                        <th style={{ border: "none", padding: "1.1rem 1.2rem" }}>Employee ID</th>
                        <th style={{ border: "none", borderTopRightRadius: 16, padding: "1.1rem 1.2rem" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentNurses.map((nurse, index) => (
                        <tr
                          key={nurse._id}
                          style={{
                            background: index % 2 === 0 ? "#f7faff" : "#fff",
                            borderRadius: 14,
                            boxShadow: "0 2px 8px rgba(42,63,157,0.03)",
                            transition: "background 0.2s",
                            verticalAlign: "middle",
                          }}
                        >
                          <td style={{ padding: "1.1rem 1.2rem", fontWeight: 600, color: "#4a6cf7", fontSize: "1.05rem", border: "none" }}>
                            {indexOfFirstNurse + index + 1}
                          </td>
                          <td 
                            style={{ padding: "1.1rem 1.2rem", border: "none", cursor: "pointer" }}
                            onClick={() => handleViewNurse(nurse)}
                          >
                            <div style={{ fontWeight: 700, color: "#263a99", fontSize: "1.08rem" }}>
                              {`${nurse.firstName} ${nurse.middleName || ""} ${nurse.lastName}`}
                            </div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div style={{ color: "#374151", fontWeight: 500 }}>{nurse.email}</div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div style={{ color: "#374151" }}>{nurse.mobileNumber}</div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div style={{ color: "#263a99" }}>{nurse.gender}</div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div style={{ color: "#64748b" }}>
                              {nurse.dateOfBirth
                                ? new Date(nurse.dateOfBirth).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                : ""}
                            </div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div style={{ color: "#4a6cf7" }}>{nurse.nurseLicenseNumber}</div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div style={{ color: "#263a99" }}>{nurse.shiftSchedule}</div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <div style={{ color: "#263a99" }}>{nurse.employeeId}</div>
                          </td>
                          <td style={{ padding: "1.1rem 1.2rem", border: "none" }}>
                            <Dropdown>
                              <Dropdown.Toggle
                                variant="outline-secondary"
                                size="sm"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#64748b"
                                }}
                              >
                                ⋮
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleViewNurse(nurse)}>
                                  <i className="bi bi-eye"></i> View Details
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => exportSingleNursePDF(nurse)}>
                                  <i className="bi bi-file-earmark-pdf"></i> Export PDF
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                {showArchived ? (
                                  <Dropdown.Item 
                                    onClick={() => handleRestoreNurse(nurse._id)}
                                    style={{ color: "#28a745" }}
                                  >
                                    <i className="bi bi-arrow-clockwise"></i> Restore
                                  </Dropdown.Item>
                                ) : (
                                  <Dropdown.Item 
                                    onClick={() => handleArchiveNurse(nurse._id)}
                                    style={{ color: "#dc3545" }}
                                  >
                                    <i className="bi bi-archive"></i> Archive
                                  </Dropdown.Item>
                                )}
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                        </tr>
                      ))}
                      {currentNurses.length === 0 && (
                        <tr>
                          <td
                            colSpan={10}
                            style={{
                              textAlign: "center",
                              padding: "2rem",
                              color: "#64748b",
                              fontSize: "1.1rem",
                              background: "#f9fafb",
                            }}
                          >
                            {showArchived ? 'No archived nurses found.' : 'No nurses found.'}
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
        </div>

        {/* Nurse View Modal */}
        <Modal
          show={showViewModal}
          onHide={() => setShowViewModal(false)}
          size="md"
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
              Nurse Details
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
            {viewNurse && (
              <div style={{ fontSize: "1.08rem", color: "#263a99" }}>
                <Row>
                  <Col md={6} className="mb-3">
                    <strong>Name</strong>
                    <div style={{ fontWeight: 600, fontSize: "1.15rem" }}>
                      {viewNurse.firstName} {viewNurse.middleName} {viewNurse.lastName}
                    </div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <strong>Email</strong>
                    <div>{viewNurse.email}</div>
                  </Col>
                </Row>
                <Row>
                  <Col md={6} className="mb-3">
                    <strong>Mobile</strong>
                    <div>{viewNurse.mobileNumber}</div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <strong>Gender</strong>
                    <div>{viewNurse.gender}</div>
                  </Col>
                </Row>
                <Row>
                  <Col md={6} className="mb-3">
                    <strong>Date of Birth</strong>
                    <div>
                      {viewNurse.dateOfBirth
                        ? new Date(viewNurse.dateOfBirth).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : ""}
                    </div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <strong>License #</strong>
                    <div>{viewNurse.nurseLicenseNumber}</div>
                  </Col>
                </Row>
                <Row>
                  <Col md={6} className="mb-3">
                    <strong>Shift</strong>
                    <div>{viewNurse.shiftSchedule}</div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <strong>Employee ID</strong>
                    <div>{viewNurse.employeeId}</div>
                  </Col>
                </Row>
                {viewNurse.archived && (
                  <Row>
                    <Col md={12} className="mb-3">
                      <div style={{ 
                        background: "#fff3cd", 
                        padding: "0.75rem", 
                        borderRadius: "0.375rem",
                        border: "1px solid #ffeaa7"
                      }}>
                        <strong style={{ color: "#856404" }}>Status:</strong>
                        <span style={{ color: "#856404", marginLeft: "0.5rem" }}>Archived</span>
                      </div>
                    </Col>
                  </Row>
                )}
                {/* Export button at the bottom right */}
                <div className="d-flex justify-content-end mt-4">
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
                    onClick={() => exportSingleNursePDF(viewNurse)}
                  >
                    <i className="bi bi-file-earmark-pdf"></i> Export PDF
                  </Button>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default NursesPage;