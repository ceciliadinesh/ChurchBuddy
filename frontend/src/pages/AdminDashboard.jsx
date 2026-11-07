
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UsersRound,
  CalendarDays,
  ClipboardCheck,
  CircleAlert,
  ArrowRight,
  RefreshCw,
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarCheck,
  UserRound,
} from "lucide-react";

import "./AdminDashboard.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function getList(data) {
  return Array.isArray(data) ? data : data?.items || [];
}

async function apiGet(path) {
  const token = sessionStorage.getItem("admin_token");

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : data.detail?.message;

    throw new Error(detail || `Could not load ${path}.`);
  }

  return data;
}

function getLectorName(lector, lectorId) {
  if (!lector) return `Lector #${lectorId}`;

  const firstName =
    lector.first_name || lector.firstname || "";

  const lastName =
    lector.last_name || lector.lastname || "";

  const combinedName = `${firstName} ${lastName}`.trim();

  return (
    combinedName ||
    lector.full_name ||
    lector.name ||
    `Lector #${lectorId}`
  );
}

function StatCard({ label, value, note, icon: Icon, color }) {
  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-top">
        <div className={`dashboard-stat-icon ${color}`}>
          <Icon size={21} strokeWidth={1.9} />
        </div>

        <span className="dashboard-stat-note">
          {note}
        </span>
      </div>

      <div className="dashboard-stat-value">
        {value}
      </div>

      <div className="dashboard-stat-label">
        {label}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [lectors, setLectors] = useState([]);
  const [forms, setForms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [selectedForm, setSelectedForm] = useState("");
  const [searchName, setSearchName] = useState("");

  const [loading, setLoading] = useState(true);
  const [submissionLoading, setSubmissionLoading] =
    useState(false);

  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [lectorData, formData] = await Promise.all([
        apiGet("/lectors/"),
        apiGet("/monthly-forms/"),
      ]);

      const lectorList = getList(lectorData);
      const formList = getList(formData);

      setLectors(lectorList);
      setForms(formList);

      if (formList.length > 0) {
        const previousFormExists = formList.some(
          (form) => String(form.id) === String(selectedForm)
        );

        const formId = previousFormExists
          ? String(selectedForm)
          : String(formList[0].id);

        setSelectedForm(formId);

        const [assignmentData, submissionData] =
          await Promise.all([
            apiGet(`/assignments/${formId}`),
            apiGet(`/availability/monthly-form/${formId}`),
          ]);

        setAssignments(getList(assignmentData));
        setSubmissions(getList(submissionData));
      } else {
        setSelectedForm("");
        setAssignments([]);
        setSubmissions([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    // Initial dashboard load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeForm(formId) {
    setSelectedForm(formId);
    setError("");
    setSearchName("");

    if (!formId) {
      setAssignments([]);
      setSubmissions([]);
      return;
    }

    setSubmissionLoading(true);

    try {
      const [assignmentData, submissionData] =
        await Promise.all([
          apiGet(`/assignments/${formId}`),
          apiGet(`/availability/monthly-form/${formId}`),
        ]);

      setAssignments(getList(assignmentData));
      setSubmissions(getList(submissionData));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmissionLoading(false);
    }
  }

  const activeLectors = lectors.filter(
    (lector) => lector.is_active
  ).length;

  const assignedPositions = assignments.filter(
    (assignment) => assignment.lector_id !== null
  ).length;

  const unfilledPositions = assignments.filter(
    (assignment) => assignment.lector_id === null
  ).length;

  const progress =
    assignments.length > 0
      ? (assignedPositions / assignments.length) * 100
      : 0;

  const filteredSubmissions = submissions.filter(
    (submission) => {
      const name = getLectorName(
        submission.lector,
        submission.lector_id
      );

      return name
        .toLowerCase()
        .includes(searchName.trim().toLowerCase());
    }
  );

  const stats = [
    {
      label: "Active Lectors",
      value: activeLectors,
      icon: UsersRound,
      color: "rose",
      note: "Currently active members",
    },
    {
      label: "Monthly Forms",
      value: forms.length,
      icon: CalendarDays,
      color: "sage",
      note: "Created monthly forms",
    },
    {
      label: "Assigned Positions",
      value: assignedPositions,
      icon: ClipboardCheck,
      color: "lavender",
      note: "For the selected month",
    },
    {
      label: "Unfilled Positions",
      value: unfilledPositions,
      icon: CircleAlert,
      color: "peach",
      note: "Still need a lector",
    },
  ];

  return (
    <div className="admin-dashboard">

      {/* Page heading */}

      <div className="dashboard-header">
        <div className="dashboard-heading-content">
          <p className="dashboard-eyebrow">
            YOUR CHURCH AT A GLANCE
          </p>

          <h1 className="dashboard-title">
            Admin Dashboard
          </h1>

          <p className="dashboard-description">
            An overview of your lector community and
            monthly service schedule.
          </p>
        </div>

        <button
          className="dashboard-refresh-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "refresh-spinning" : ""}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error message */}

      {error && (
        <div className="dashboard-error">
          <CircleAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <RefreshCw size={23} className="refresh-spinning" />
          <p>Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {/* Statistics */}

          <section className="dashboard-stats-grid">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                {...stat}
              />
            ))}
          </section>

          {/* Monthly assignments */}

          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <div className="dashboard-section-title">
                  <CalendarCheck size={19} />
                  <h2>Monthly assignments</h2>
                </div>

                <p className="dashboard-section-description">
                  Monitor assignment progress for each monthly form.
                </p>
              </div>

              <div className="dashboard-select-wrapper">
                <CalendarDays size={17} />

                <select
                  value={selectedForm}
                  onChange={(event) =>
                    changeForm(event.target.value)
                  }
                  className="dashboard-form-select"
                  disabled={forms.length === 0}
                >
                  {forms.map((form) => (
                    <option
                      key={form.id}
                      value={form.id}
                    >
                      {form.title ||
                        `${form.month}/${form.year}`}
                    </option>
                  ))}
                </select>

                <ChevronDown size={15} />
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="dashboard-empty-state">
                <ClipboardCheck size={28} />
                <p>
                  No assignment positions found for this
                  monthly form yet.
                </p>
              </div>
            ) : (
              <div className="dashboard-progress-content">
                <div className="dashboard-progress-summary">
                  <div>
                    <span className="dashboard-progress-caption">
                      Assignment completion
                    </span>

                    <div className="dashboard-progress-percentage">
                      {Math.round(progress)}%
                      <span> completed</span>
                    </div>
                  </div>

                  <div className="dashboard-progress-count">
                    <strong>
                      {assignedPositions}
                      <span> / {assignments.length}</span>
                    </strong>
                    <small>Filled positions</small>
                  </div>
                </div>

                <div
                  className="dashboard-progress-track"
                  role="progressbar"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="dashboard-progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="dashboard-progress-footer">
                  <span>
                    <span className="progress-dot filled-dot" />
                    {assignedPositions} Assigned
                  </span>

                  <span>
                    <span className="progress-dot empty-dot" />
                    {unfilledPositions} Unfilled
                  </span>

                  <span>
                    {assignments.length} Total positions
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Availability submissions */}

          <section className="dashboard-panel">
            <div className="dashboard-panel-header submissions-heading">
              <div>
                <div className="dashboard-section-title">
                  <FileText size={19} />
                  <h2>Lector Availability Submissions</h2>
                </div>

                <p className="dashboard-section-description">
                  Search for a lector to view their submitted
                  Google Form information.
                </p>
              </div>

              <div className="dashboard-submission-count">
                <strong>{submissions.length}</strong>
                <span>Submissions</span>
              </div>
            </div>

            {/* Search */}

            <div className="dashboard-search-wrapper">
              <Search size={19} />

              <input
                type="text"
                placeholder="Search lector by name..."
                value={searchName}
                onChange={(event) =>
                  setSearchName(event.target.value)
                }
                className="dashboard-search-input"
              />

              {searchName && (
                <button
                  type="button"
                  className="dashboard-clear-search"
                  onClick={() => setSearchName("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="dashboard-results-info">
              Showing{" "}
              <strong>{filteredSubmissions.length}</strong>{" "}
              of{" "}
              <strong>{submissions.length}</strong>{" "}
              submissions
            </div>

            {submissionLoading ? (
              <div className="dashboard-loading dashboard-small-loading">
                <RefreshCw
                  size={21}
                  className="refresh-spinning"
                />
                <p>Loading submissions...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="dashboard-empty-state">
                <UsersRound size={28} />

                <p>
                  {searchName
                    ? "No lector submissions match your search."
                    : "No submissions found for this monthly form."}
                </p>
              </div>
            ) : (
              <div className="dashboard-submissions-list">
                {filteredSubmissions.map((submission) => {
                  const lectorName = getLectorName(
                    submission.lector,
                    submission.lector_id
                  );

                  return (
                    <details
                      key={submission.submission_id}
                      className="dashboard-submission-card"
                    >
                      <summary className="dashboard-submission-summary">
                        <div className="dashboard-lector-avatar">
                          <UserRound size={21} />
                        </div>

                        <div className="dashboard-lector-info">
                          <strong>{lectorName}</strong>

                          <span>
                            Lector ID: {submission.lector_id}
                          </span>
                        </div>

                        <span className="dashboard-view-label">
                          View submission
                        </span>

                        <ChevronDown
                          size={19}
                          className="dashboard-submission-chevron"
                        />
                      </summary>

                      <div className="dashboard-submission-details">

                        <div className="submission-info-grid">
                          <div className="submission-info-item">
                            <span>Submission ID</span>
                            <strong>
                              {submission.submission_id}
                            </strong>
                          </div>

                          <div className="submission-info-item">
                            <span>Lector ID</span>
                            <strong>
                              {submission.lector_id}
                            </strong>
                          </div>

                          <div className="submission-info-item">
                            <span>Day Availability</span>
                            <strong>
                              {submission.day_availability || "Not specified"}
                            </strong>
                          </div>

                          <div className="submission-info-item">
                            <span>Mass Preference</span>
                            <strong>
                              {submission.mass_preference || "Not specified"}
                            </strong>
                          </div>
                        </div>

                        <div className="submission-detail-section">
                          <h4>
                            <CalendarDays size={16} />
                            Available Days
                          </h4>

                          {submission.available_days?.length > 0 ? (
                            <div className="submission-tags">
                              {submission.available_days.map(
                                (day, index) => (
                                  <span key={index}>
                                    {day}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <p>Not specified</p>
                          )}
                        </div>

                        <div className="submission-detail-section">
                          <h4>
                            <ClipboardCheck size={16} />
                            Responsibilities
                          </h4>

                          {submission.responsibilities?.length > 0 ? (
                            <div className="submission-tags">
                              {submission.responsibilities.map(
                                (responsibility, index) => (
                                  <span key={index}>
                                    {responsibility}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <p>None selected</p>
                          )}
                        </div>

                        <div className="submission-detail-section">
                          <h4>
                            <Clock size={16} />
                            Unavailable Dates
                          </h4>

                          {submission.unavailable_dates?.length > 0 ? (
                            <div className="submission-dates-list">
                              {submission.unavailable_dates.map(
                                (date, index) => (
                                  <div
                                    className="submission-date-item"
                                    key={index}
                                  >
                                    <CalendarDays size={16} />

                                    <div>
                                      <strong>
                                        {date.start_date} to {date.end_date}
                                      </strong>

                                      {date.reason && (
                                        <span>{date.reason}</span>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <p>No unavailable dates submitted.</p>
                          )}
                        </div>

                        <div className="submission-detail-section">
                          <h4>Additional Requests</h4>

                          <p className="submission-additional-requests">
                            {submission.additional_requests || "None"}
                          </p>
                        </div>

                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick actions */}

          <section className="dashboard-quick-actions-section">
            <div className="dashboard-quick-heading">
              <h2>Quick Actions</h2>

              <p>
                Quickly access the main administration sections.
              </p>
            </div>

            <div className="dashboard-quick-actions-grid">

              <Link
                to="/admin/lectors"
                className="dashboard-action-card"
              >
                <div className="dashboard-action-icon action-rose">
                  <UsersRound size={22} />
                </div>

                <div className="dashboard-action-content">
                  <h3>Manage Lectors</h3>

                  <p>
                    Add, edit or deactivate lector accounts.
                  </p>
                </div>

                <ArrowRight
                  size={19}
                  className="dashboard-action-arrow"
                />
              </Link>

              <Link
                to="/admin/scheduling"
                className="dashboard-action-card"
              >
                <div className="dashboard-action-icon action-sage">
                  <CalendarDays size={22} />
                </div>

                <div className="dashboard-action-content">
                  <h3>Manage Schedule</h3>

                  <p>
                    Close forms, select frozen dates and
                    assign duties.
                  </p>
                </div>

                <ArrowRight
                  size={19}
                  className="dashboard-action-arrow"
                />
              </Link>

             

            </div>
          </section>
        </>
      )}
    </div>
  );
}
