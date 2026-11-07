
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  UserRoundX,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Phone,
  X,
  Contact,
  Smartphone,
} from "lucide-react";
import "./LectorManagement.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const emptyForm = {
  first_name: "",
  last_name: "",
  phone: "",
};

function getList(data) {
  return Array.isArray(data) ? data : data?.items || [];
}

async function getErrorMessage(response, fallback) {
  const data = await response.json().catch(() => ({}));

  if (typeof data.detail === "string") return data.detail;
  if (data.detail?.message) return data.detail.message;

  return fallback;
}

function getInitials(lector) {
  return `${lector.first_name?.[0] || ""}${lector.last_name?.[0] || ""}`.toUpperCase();
}

export default function LectorManagement() {
  const [lectors, setLectors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem("admin_token")}`,
    };
  }

  async function loadLectors() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/lectors/`, {
        headers: headers(),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to load lectors.")
        );
      }

      setLectors(getList(await response.json()));
    } catch (err) {
      setError(err.message || "Unable to load lectors.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLectors();
  }, []);

  const activeCount = lectors.filter((lector) => lector.is_active).length;
  const inactiveCount = lectors.length - activeCount;

  const filteredLectors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return lectors;

    return lectors.filter((lector) => {
      const fullName =
        `${lector.first_name || ""} ${lector.last_name || ""}`.toLowerCase();
      const phone = (lector.phone || "").toLowerCase();

      return fullName.includes(query) || phone.includes(query);
    });
  }, [lectors, search]);

  function startAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function startEdit(lector) {
    setEditingId(lector.id);
    setForm({
      first_name: lector.first_name || "",
      last_name: lector.last_name || "",
      phone: lector.phone || "",
    });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function saveLector(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const url = editingId
      ? `${API_URL}/lectors/${editingId}`
      : `${API_URL}/lectors/`;

    try {
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: headers(),
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to save lector.")
        );
      }

      setMessage(
        editingId
          ? "Lector details updated successfully."
          : "New lector added successfully."
      );

      closeForm();
      await loadLectors();
    } catch (err) {
      setError(err.message || "Unable to save lector.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateLector(lector) {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${lector.first_name} ${lector.last_name}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/lectors/${lector.id}`, {
        method: "DELETE",
        headers: headers(),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to deactivate lector.")
        );
      }

      setMessage("Lector deactivated successfully.");
      await loadLectors();
    } catch (err) {
      setError(err.message || "Unable to deactivate lector.");
    }
  }

  return (
    <main className="lector-page">
      <header className="lector-page-header">
        <div>
          <div className="lector-eyebrow">
            <span className="lector-eyebrow-dot" />
            CHURCH ADMINISTRATION
          </div>

          <h1 className="lector-page-title">Lector Management</h1>

          <p className="lector-page-description">
            Manage your church lectors and keep their contact details up to date.
          </p>
        </div>

        <button className="lector-primary-button" onClick={startAdd}>
          <Plus size={19} strokeWidth={2.5} />
          <span>Add Lector</span>
        </button>
      </header>

      {error && (
        <div className="lector-alert lector-alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={17} />
          </button>
        </div>
      )}

      {message && (
        <div className="lector-alert lector-alert-success" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Dismiss message">
            <X size={17} />
          </button>
        </div>
      )}

      <section className="lector-stats-grid">
        <article className="lector-stat-card">
          <div className="lector-stat-icon lector-stat-icon-total">
            <Users size={21} />
          </div>
          <div className="lector-stat-content">
            <span className="lector-stat-label">Total lectors</span>
            <strong>{lectors.length}</strong>
            <span className="lector-stat-note">Registered records</span>
          </div>
        </article>

        <article className="lector-stat-card">
          <div className="lector-stat-icon lector-stat-icon-active">
            <UserCheck size={21} />
          </div>
          <div className="lector-stat-content">
            <span className="lector-stat-label">Active lectors</span>
            <strong>{activeCount}</strong>
            <span className="lector-stat-note">Currently available</span>
          </div>
        </article>

        <article className="lector-stat-card">
          <div className="lector-stat-icon lector-stat-icon-inactive">
            <UserX size={21} />
          </div>
          <div className="lector-stat-content">
            <span className="lector-stat-label">Inactive lectors</span>
            <strong>{inactiveCount}</strong>
            <span className="lector-stat-note">Deactivated records</span>
          </div>
        </article>
      </section>

      <section className="lector-panel">
        <div className="lector-panel-header">
          <div>
            <div className="lector-panel-title-row">
              <h2>Registered lectors</h2>
              <span className="lector-count-badge">{lectors.length}</span>
            </div>
            <p>View and manage your lector directory.</p>
          </div>

          <button
            className="lector-refresh-button"
            onClick={loadLectors}
            disabled={loading}
            title="Refresh lectors"
            aria-label="Refresh lectors"
          >
            <RefreshCw size={17} className={loading ? "lector-spinning" : ""} />
          </button>
        </div>

        <div className="lector-toolbar">
          <div className="lector-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search by name or mobile number..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search lectors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <span className="lector-results-label">
            {filteredLectors.length}{" "}
            {filteredLectors.length === 1 ? "result" : "results"}
          </span>
        </div>

        {loading ? (
          <div className="lector-empty-state">
            <div className="lector-empty-icon">
              <RefreshCw size={25} className="lector-spinning" />
            </div>
            <h3>Loading lectors</h3>
            <p>Please wait while we fetch your lector records.</p>
          </div>
        ) : filteredLectors.length === 0 ? (
          <div className="lector-empty-state">
            <div className="lector-empty-icon">
              <Contact size={27} />
            </div>
            <h3>{search ? "No matching lectors" : "No lectors yet"}</h3>
            <p>
              {search
                ? "Try another name or mobile number."
                : "Add your first lector to start building your directory."}
            </p>
            {!search && (
              <button className="lector-primary-button" onClick={startAdd}>
                <Plus size={18} />
                Add your first lector
              </button>
            )}
          </div>
        ) : (
          <div className="lector-table-wrap">
            <table className="lector-table">
              <thead>
                <tr>
                  <th>LECTOR</th>
                  <th>MOBILE NUMBER</th>
                  <th>STATUS</th>
                  <th className="lector-actions-heading">ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredLectors.map((lector) => (
                  <tr key={lector.id}>
                    <td>
                      <div className="lector-person">
                        <div className="lector-avatar">
                          {getInitials(lector) || <Users size={18} />}
                        </div>
                        <div className="lector-person-details">
                          <strong>
                            {lector.first_name} {lector.last_name}
                          </strong>
                          <span>Lector</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="lector-phone">
                        <span className="lector-phone-icon">
                          <Phone size={15} />
                        </span>
                        {lector.phone || "Not provided"}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`lector-status ${
                          lector.is_active
                            ? "lector-status-active"
                            : "lector-status-inactive"
                        }`}
                      >
                        <span />
                        {lector.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="lector-row-actions">
                        <button
                          className="lector-action-button"
                          onClick={() => startEdit(lector)}
                          title="Edit lector"
                          aria-label={`Edit ${lector.first_name} ${lector.last_name}`}
                        >
                          <Pencil size={16} />
                          <span>Edit</span>
                        </button>

                        {lector.is_active && (
                          <button
                            className="lector-action-button lector-action-danger"
                            onClick={() => deactivateLector(lector)}
                            title="Deactivate lector"
                            aria-label={`Deactivate ${lector.first_name} ${lector.last_name}`}
                          >
                            <UserRoundX size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredLectors.length > 0 && (
          <div className="lector-panel-footer">
            Showing <strong>{filteredLectors.length}</strong> of{" "}
            <strong>{lectors.length}</strong> lectors
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="lector-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="lector-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lector-modal-title"
          >
            <div className="lector-modal-header">
              <div className="lector-modal-heading">
                <div className="lector-modal-icon">
                  {editingId ? <Pencil size={21} /> : <UserPlusIcon />}
                </div>
                <div>
                  <h2 id="lector-modal-title">
                    {editingId ? "Edit lector" : "Add a new lector"}
                  </h2>
                  <p>
                    {editingId
                      ? "Update this lector's contact information."
                      : "Enter the details of your new lector."}
                  </p>
                </div>
              </div>

              <button
                className="lector-modal-close"
                onClick={closeForm}
                type="button"
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveLector}>
              <div className="lector-modal-body">
                <div className="lector-form-section-label">
                  PERSONAL INFORMATION
                </div>

                <div className="lector-form-grid">
                  <div className="lector-field">
                    <label htmlFor="lector-first-name">First name</label>
                    <input
                      id="lector-first-name"
                      name="first_name"
                      value={form.first_name}
                      onChange={updateField}
                      placeholder="e.g. John"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="lector-field">
                    <label htmlFor="lector-last-name">Last name</label>
                    <input
                      id="lector-last-name"
                      name="last_name"
                      value={form.last_name}
                      onChange={updateField}
                      placeholder="e.g. D'Souza"
                      required
                    />
                  </div>
                </div>

                <div className="lector-field lector-phone-field">
                  <label htmlFor="lector-phone">Mobile number</label>
                  <div className="lector-input-with-icon">
                    <Smartphone size={18} />
                    <input
                      id="lector-phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={updateField}
                      placeholder="Enter mobile number"
                    />
                  </div>
                  <span className="lector-field-hint">
                    Include the country code if needed.
                  </span>
                </div>
              </div>

              <div className="lector-modal-footer">
                <button
                  type="button"
                  className="lector-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="lector-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={17} className="lector-spinning" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingId ? <Pencil size={17} /> : <Plus size={18} />}
                      {editingId ? "Save Changes" : "Add Lector"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function UserPlusIcon() {
  return <Plus size={22} />;
}
