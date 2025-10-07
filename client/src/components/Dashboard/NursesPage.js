import React, { useEffect, useState } from "react";
import api from "../../services/api";
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
        ? '/nurses/archived'
        : '/nurses';
      const res = await api.get(endpoint);
      
      console.log('👨‍⚕️ Nurses Response:', res.data); // DEBUG
      
      if (showArchived) {
        setNurses(res.data.data || res.data);
      } else {
        const nursesData = res.data;
        console.log('👨‍⚕️ Nurses Data:', nursesData); // DEBUG
        console.log('👨‍⚕️ Total Nurses:', nursesData.length); // DEBUG
        setNurses(nursesData.filter(nurse => nurse.approved));
      }
    } catch (err) {
      console.error('👨‍⚕️ Error fetching nurses:', err); // DEBUG
      setError("Failed to fetch nurses.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveNurse = async (id) => {
    if (window.confirm('Are you sure you want to archive this nurse?')) {
      try {
        await api.delete(`/nurses/${id}`);
        fetchNurses();
      } catch (err) {
        alert('Failed to archive nurse');
      }
    }
  };

  const handleRestoreNurse = async (id) => {
    if (window.confirm('Are you sure you want to restore this nurse?')) {
      try {
        await api.put(`/nurses/${id}/restore`);
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
        await api.get('/nurses/archived').then(res => res.data.data || res.data) :
        nurses;
        
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/nurses/export/pdf`, {
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/nurses/export/pdf`, {
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
                {showArchived ? 'Archived Nurses' : 'Nurses Management'}
              </h2>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  marginBottom: 0,
                  fontSize: "1rem",
                  fontWeight: 500,
                }}
              >
                {showArchived ? 'View archived nurse records' : 'View and manage all nursing staff'}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Button
                onClick={() => setShowArchived(!showArchived)}
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
                  {showArchived ? (
                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  ) : (
                    <path d="M21 8v13H3V8M1 3h22v5H1V3zm9 5v13m4-13v13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  )}
                </svg>
                {showArchived ? 'Show Active' : 'Show Archived'}
              </Button>
              <Button
                onClick={exportNursesPDF}
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
                  placeholder="Search nurses by name..."
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
                  Loading nurses...
                </p>
              </div>
            ) : error ? (
              <Alert variant="danger" style={{ margin: "2rem", borderRadius: "12px" }}>{error}</Alert>
            ) : (
              <>
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
                        <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Nurse Name</th>
                        <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Contact Info</th>
                        <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Personal</th>
                        <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Professional</th>
                        <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Schedule</th>
                        <th style={{ border: "none", padding: "1.25rem 1.5rem", fontFamily: "'Inter Tight', sans-serif" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentNurses.map((nurse, index) => (
                        <tr
                          key={nurse._id}
                          style={{
                            background: index % 2 === 0 ? "#f8fafc" : "#ffffff",
                            transition: "all 0.2s ease",
                            verticalAlign: "middle",
                            cursor: "pointer",
                            borderLeft: "4px solid transparent",
                          }}
                          onClick={() => handleViewNurse(nurse)}
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
                            {indexOfFirstNurse + index + 1}
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
                                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontWeight: 800,
                                  fontSize: "1.1rem",
                                  flexShrink: 0,
                                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
                                  fontFamily: "'Inter Tight', sans-serif",
                                }}
                              >
                                {nurse.firstName?.charAt(0)}{nurse.lastName?.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: "#2a3f9d", fontSize: "1rem", fontFamily: "'Inter Tight', sans-serif" }}>
                                  {`${nurse.firstName} ${nurse.middleName || ""} ${nurse.lastName}`}
                                </div>
                                <div style={{ 
                                  color: "#64748b", 
                                  fontSize: "0.8rem", 
                                  marginTop: "0.25rem",
                                  background: "#f1f5f9",
                                  padding: "0.125rem 0.5rem",
                                  borderRadius: "6px",
                                  display: "inline-block",
                                  fontWeight: 600,
                                }}>
                                  ID: {nurse.employeeId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "1.25rem 1.5rem", border: "none" }}>
                            <div style={{ fontSize: "0.875rem", lineHeight: "1.6" }}>
                              <div style={{ color: "#475569", fontWeight: 500 }}>{nurse.email}</div>
                              <div style={{ color: "#64748b", marginTop: "0.25rem" }}>{nurse.mobileNumber}</div>
                            </div>
                          </td>
                          <td style={{ padding: "1.25rem 1.5rem", border: "none" }}>
                            <div style={{ fontSize: "0.875rem", lineHeight: "1.6" }}>
                              <div>
                                <span style={{ fontWeight: 700, color: "#2a3f9d" }}>Gender:</span>{" "}
                                <span style={{ color: "#64748b" }}>{nurse.gender}</span>
                              </div>
                              <div style={{ color: "#64748b", marginTop: "0.25rem", fontSize: "0.85rem" }}>
                                {nurse.dateOfBirth
                                  ? new Date(nurse.dateOfBirth).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "N/A"}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "1.25rem 1.5rem", border: "none" }}>
                            <div
                              style={{
                                background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "10px",
                                border: "1px solid rgba(59, 130, 246, 0.2)",
                                fontSize: "0.875rem",
                              }}
                            >
                              <div style={{ fontWeight: 700, color: "#1e40af" }}>
                                License: {nurse.nurseLicenseNumber}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "1.25rem 1.5rem", border: "none" }}>
                            <div
                              style={{
                                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "10px",
                                border: "1px solid rgba(245, 158, 11, 0.2)",
                                fontSize: "0.875rem",
                                fontWeight: 700,
                                color: "#92400e",
                                textAlign: "center",
                              }}
                            >
                              {nurse.shiftSchedule}
                            </div>
                          </td>
                          <td style={{ padding: "1.25rem 1.5rem", border: "none" }} onClick={(e) => e.stopPropagation()}>
                            <Dropdown align="end">
                              <Dropdown.Toggle
                                variant="outline-secondary"
                                size="sm"
                                style={{
                                  border: "2px solid #e2e8f0",
                                  background: "#fff",
                                  color: "#64748b",
                                  borderRadius: "8px",
                                  fontWeight: 700,
                                  fontSize: "1.2rem",
                                  padding: "0.25rem 0.75rem",
                                  lineHeight: 1,
                                }}
                              >
                                ⋮
                              </Dropdown.Toggle>
                              <Dropdown.Menu 
                                style={{ 
                                  borderRadius: "12px", 
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)", 
                                  border: "1px solid #e2e8f0",
                                  padding: "0.5rem",
                                  minWidth: "180px",
                                  zIndex: 1050,
                                }}
                              >
                                <Dropdown.Item 
                                  onClick={() => handleViewNurse(nurse)}
                                  style={{ 
                                    padding: "0.75rem 1rem", 
                                    fontWeight: 600,
                                    borderRadius: "8px",
                                    marginBottom: "0.25rem",
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "0.5rem", verticalAlign: "middle" }}>
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#4a6cf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="#4a6cf7" strokeWidth="2"/>
                                  </svg>
                                  View Details
                                </Dropdown.Item>
                                <Dropdown.Item 
                                  onClick={() => exportSingleNursePDF(nurse)}
                                  style={{ 
                                    padding: "0.75rem 1rem", 
                                    fontWeight: 600,
                                    borderRadius: "8px",
                                    marginBottom: "0.25rem",
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "0.5rem", verticalAlign: "middle" }}>
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Export PDF
                                </Dropdown.Item>
                                <Dropdown.Divider style={{ margin: "0.5rem 0" }} />
                                {showArchived ? (
                                  <Dropdown.Item 
                                    onClick={() => handleRestoreNurse(nurse._id)}
                                    style={{ 
                                      color: "#10b981", 
                                      padding: "0.75rem 1rem", 
                                      fontWeight: 600,
                                      borderRadius: "8px",
                                    }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "0.5rem", verticalAlign: "middle" }}>
                                      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Restore
                                  </Dropdown.Item>
                                ) : (
                                  <Dropdown.Item 
                                    onClick={() => handleArchiveNurse(nurse._id)}
                                    style={{ 
                                      color: "#f59e0b", 
                                      padding: "0.75rem 1rem", 
                                      fontWeight: 600,
                                      borderRadius: "8px",
                                    }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "0.5rem", verticalAlign: "middle" }}>
                                      <path d="M21 8v13H3V8M1 3h22v5H1V3zm9 5v13m4-13v13" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Archive
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
                            {showArchived ? 'No archived nurses found.' : 'No nurses found.'}
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
        </div>

        {/* Nurse View Modal */}
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
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#fff",
              borderBottom: "none",
              padding: "1.5rem 2rem",
            }}
          >
            <Modal.Title style={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", fontFamily: "'Inter Tight', sans-serif" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "0.75rem", verticalAlign: "middle" }}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 11l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Nurse Details
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            style={{
              background: "#f8fafc",
              padding: "2rem",
            }}
          >
            {viewNurse && (
              <div style={{ fontSize: "0.95rem", color: "#475569" }}>
                {/* Nurse Avatar */}
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
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "2rem",
                      marginBottom: "1rem",
                      boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)",
                      fontFamily: "'Inter Tight', sans-serif",
                    }}
                  >
                    {viewNurse.firstName?.charAt(0)}{viewNurse.lastName?.charAt(0)}
                  </div>
                  <h4 style={{ 
                    fontWeight: 800, 
                    color: "#2a3f9d", 
                    marginBottom: "0.5rem",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: "1.5rem"
                  }}>
                    {viewNurse.firstName} {viewNurse.middleName} {viewNurse.lastName}
                  </h4>
                  <div style={{
                    display: "inline-block",
                    background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                    padding: "0.375rem 1rem",
                    borderRadius: "8px",
                    fontWeight: 700,
                    color: "#1e40af",
                    fontSize: "0.95rem",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                  }}>
                    License: {viewNurse.nurseLicenseNumber}
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
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Employee ID</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewNurse.employeeId}
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
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Shift Schedule</strong>
                      <div style={{ 
                        color: "#92400e", 
                        fontWeight: 700, 
                        marginTop: "0.25rem",
                        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "6px",
                        display: "inline-block",
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                      }}>
                        {viewNurse.shiftSchedule}
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
                        {viewNurse.email}
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
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Mobile</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewNurse.mobileNumber}
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
                        {viewNurse.gender}
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
                      <strong style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date of Birth</strong>
                      <div style={{ color: "#2a3f9d", fontWeight: 600, marginTop: "0.25rem" }}>
                        {viewNurse.dateOfBirth
                          ? new Date(viewNurse.dateOfBirth).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "N/A"}
                      </div>
                    </div>
                  </Col>
                </Row>

                {viewNurse.archived && (
                  <div style={{ 
                    marginTop: "1.5rem",
                    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", 
                    padding: "1rem 1.25rem", 
                    borderRadius: "12px",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem"
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <strong style={{ color: "#92400e", fontSize: "0.9rem" }}>Status:</strong>
                      <span style={{ color: "#92400e", marginLeft: "0.5rem", fontWeight: 700 }}>Archived</span>
                    </div>
                  </div>
                )}

                <div className="d-flex justify-content-end mt-4" style={{ gap: "0.75rem", paddingTop: "1.5rem", borderTop: "2px solid #e2e8f0" }}>
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
                    onClick={() => exportSingleNursePDF(viewNurse)}
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