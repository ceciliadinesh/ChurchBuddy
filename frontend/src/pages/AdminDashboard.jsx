
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
} from "lucide-react";

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

  async function loadSubmissions(formId) {
    if (!formId) {
      setSubmissions([]);
      return;
    }

    setSubmissionLoading(true);

    try {
      const data = await apiGet(
        `/availability/monthly-form/${formId}`
      );

      setSubmissions(getList(data));
    } catch (err) {
      setSubmissions([]);
      setError(err.message);
    } finally {
      setSubmissionLoading(false);
    }
  }

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

  return (
    <div>
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">
            YOUR CHURCH AT A GLANCE
          </p>

          <h1 className="page-title">
            Admin Dashboard
          </h1>

          <p className="page-description">
            An overview of your lector community and
            monthly service schedule.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="notice-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-message">
          Loading your dashboard...
        </div>
      ) : (
        <>
          {/* Dashboard statistics */}

          <div className="stats-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  className="stat-card"
                  key={stat.label}
                >
                  <div
                    className={`stat-icon ${stat.color}`}
                  >
                    <Icon size={22} />
                  </div>

                  <p className="stat-label">
                    {stat.label}
                  </p>

                  <h2>{stat.value}</h2>

                  <p className="stat-note">
                    {stat.note}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Monthly assignments */}

          <section className="content-card dashboard-section">
            <div className="section-heading">
              <div>
                <h2>Monthly assignments</h2>

                <p>
                  Choose a form to see its assignment
                  progress.
                </p>
              </div>

              <select
                value={selectedForm}
                onChange={(event) =>
                  changeForm(event.target.value)
                }
                className="form-select"
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
            </div>

            {assignments.length === 0 ? (
              <p className="empty-state">
                No assignment positions found for this
                monthly form yet.
              </p>
            ) : (
              <div className="progress-area">
                <div className="progress-labels">
                  <span>Filled positions</span>

                  <strong>
                    {assignedPositions} / {assignments.length}
                  </strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Google Form submissions search */}

          <section className="content-card dashboard-section">
            <div className="section-heading">
              <div>
                <h2>
                  <FileText
                    size={20}
                    style={{
                      verticalAlign: "middle",
                      marginRight: 8,
                    }}
                  />
                  Lector Availability Submissions
                </h2>

                <p>
                  Search for a lector to view their
                  submitted Google Form information.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <Search size={20} />

              <input
                type="text"
                className="form-input"
                placeholder="Search lector by name..."
                value={searchName}
                onChange={(event) =>
                  setSearchName(event.target.value)
                }
                style={{
                  width: "100%",
                }}
              />
            </div>

            <p className="stat-note">
              {submissions.length} submission(s) found.
              {" "}
              {filteredSubmissions.length} matching your search.
            </p>

            {submissionLoading ? (
              <div className="loading-message">
                Loading submissions...
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <p className="empty-state">
                {searchName
                  ? "No lector submissions match your search."
                  : "No submissions found for this monthly form."}
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  marginTop: 16,
                }}
              >
                {filteredSubmissions.map((submission) => {
                  const lectorName = getLectorName(
                    submission.lector,
                    submission.lector_id
                  );

                  return (
                    <details
                      key={submission.submission_id}
                      className="submission-card"
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          fontWeight: 600,
                          padding: 8,
                        }}
                      >
                        <UsersRound
                          size={18}
                          style={{
                            verticalAlign: "middle",
                            marginRight: 8,
                          }}
                        />

                        {lectorName}

                        <span
                          style={{
                            marginLeft: 10,
                            fontSize: 12,
                            opacity: 0.7,
                          }}
                        >
                          View submission
                        </span>
                      </summary>

                      <div style={{ padding: 12 }}>
                        <p>
                          <strong>Submission ID:</strong>{" "}
                          {submission.submission_id}
                        </p>

                        <p>
                          <strong>Lector ID:</strong>{" "}
                          {submission.lector_id}
                        </p>

                        <p>
                          <strong>Day Availability:</strong>{" "}
                          {submission.day_availability}
                        </p>

                        <p>
                          <strong>Mass Preference:</strong>{" "}
                          {submission.mass_preference}
                        </p>

                        <p>
                          <strong>Available Days:</strong>
                        </p>

                        {submission.available_days?.length > 0 ? (
                          <ul>
                            {submission.available_days.map(
                              (day, index) => (
                                <li key={index}>{day}</li>
                              )
                            )}
                          </ul>
                        ) : (
                          <p>Not specified</p>
                        )}

                        <p>
                          <strong>Responsibilities:</strong>
                        </p>

                        {submission.responsibilities?.length > 0 ? (
                          <ul>
                            {submission.responsibilities.map(
                              (responsibility, index) => (
                                <li key={index}>
                                  {responsibility}
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <p>None selected</p>
                        )}

                        <p>
                          <strong>Unavailable Dates:</strong>
                        </p>

                        {submission.unavailable_dates?.length > 0 ? (
                          <ul>
                            {submission.unavailable_dates.map(
                              (date, index) => (
                                <li key={index}>
                                  {date.start_date} to{" "}
                                  {date.end_date}

                                  {date.reason
                                    ? ` — ${date.reason}`
                                    : ""}
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <p>No unavailable dates submitted.</p>
                        )}

                        <p>
                          <strong>Additional Requests:</strong>{" "}
                          {submission.additional_requests ||
                            "None"}
                        </p>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick actions */}

          <section className="quick-actions">
            <Link
              to="/admin/lectors"
              className="quick-action-card"
            >
              <UsersRound size={23} />

              <div>
                <h3>Manage Lectors</h3>
                <p>
                  Add, edit or deactivate lector accounts.
                </p>
              </div>

              <ArrowRight size={18} />
            </Link>

            <Link
              to="/admin/scheduling"
              className="quick-action-card"
            >
              <CalendarDays size={23} />

              <div>
                <h3>Manage Schedule</h3>
                <p>
                  Close forms, select frozen dates and
                  assign duties.
                </p>
              </div>

              <ArrowRight size={18} />
            </Link>

            <Link
              to="/availability"
              className="quick-action-card"
            >
              <ClipboardCheck size={23} />

              <div>
                <h3>Lector Availability</h3>
                <p>
                  Open the availability submission page.
                </p>
              </div>

              <ArrowRight size={18} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
