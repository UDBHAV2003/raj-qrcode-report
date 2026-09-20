import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import Header from '../components/Header'
import { usePatients } from '../context/PatientContext'
import './Dashboard.css'

/*
|--------------------------------------------------------------------------
| ICONS (inline SVG, no extra dependency)
|--------------------------------------------------------------------------
*/

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const IconPencil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
)
const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

function formatDate(dateStr) {
  if (!dateStr) return '—'

  const d = new Date(dateStr)

  if (Number.isNaN(d.getTime())) return dateStr

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function initials(name) {
  if (!name) return '?'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

const AVATAR_PALETTE = ['pal-teal', 'pal-gold', 'pal-blue', 'pal-plum', 'pal-rose']

function avatarClass(name) {
  if (!name) return AVATAR_PALETTE[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

/*
|--------------------------------------------------------------------------
| CHECK PATIENT RESULT STATUS
|--------------------------------------------------------------------------
|
| Rules:
|
| 1. Patient must have at least one test.
| 2. Every selected test must have a results object.
| 3. Every selected parameter must have a filled value.
| 4. If even ONE parameter is empty -> Pending.
| 5. Only when ALL parameter values are filled -> Completed.
|
|--------------------------------------------------------------------------
*/

function isPatientCompleted(patient) {
  if (!patient?.tests || patient.tests.length === 0) {
    return false
  }

  const results = patient.results || {}

  for (const test of patient.tests) {
    const testResult = results[test.id]

    // Test result itself doesn't exist
    if (!testResult?.params) {
      return false
    }

    for (const param of test.params || []) {
      const value = testResult.params[param.key]

      // Empty / missing value = Pending
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ''
      ) {
        return false
      }
    }
  }

  return true
}

/*
|--------------------------------------------------------------------------
| GET DISPLAY STATUS
|--------------------------------------------------------------------------
*/

function getPatientStatus(patient) {
  return isPatientCompleted(patient)
    ? 'completed'
    : 'pending'
}

export default function Dashboard() {
  const {
    patients = [],
    deletePatient,
    updatePatient,
    deleteAllPatients,
  } = usePatients()

  const navigate = useNavigate()

  const [dateFilter, setDateFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // ----------------------------------------------------------------------
  // INLINE QUICK EDIT STATE
  // ----------------------------------------------------------------------

  const [editingId, setEditingId] = useState(null)

  const [editName, setEditName] = useState('')

  const [dreditName, setdrEditName] = useState('')

  const [editAge, setEditAge] = useState('')

  const [editGender, setEditGender] = useState('Male')

  const [editCollDate, setEditCollDate] = useState('')

  const [editReportDate, setEditReportDate] = useState('')

  /*
  |--------------------------------------------------------------------------
  | OPEN INLINE EDIT
  |--------------------------------------------------------------------------
  */

  const openInlineEdit = (p) => {
    setEditingId(p.id)

    setEditName(p.name || '')

    setdrEditName(p.referredBy || '')

    setEditAge(p.age ?? '')

    setEditGender(p.gender || 'Male')

    setEditCollDate(
      p.collDate ||
        p.collectionDate ||
        p.sampleDate ||
        ''
    )

    setEditReportDate(p.reportDate || '')
  }

  /*
  |--------------------------------------------------------------------------
  | CANCEL INLINE EDIT
  |--------------------------------------------------------------------------
  */

  const cancelInlineEdit = () => {
    setEditingId(null)
  }

  /*
  |--------------------------------------------------------------------------
  | SAVE INLINE EDIT
  |--------------------------------------------------------------------------
  */

  const saveInlineEdit = (id) => {
    const name = editName.trim()

    if (!name) {
      window.alert('Patient name is required.')
      return
    }

    if (typeof updatePatient !== 'function') {
      window.alert(
        'Cannot save yet: PatientContext is missing an "updatePatient" method.'
      )

      return
    }

    const existingPatient = patients.find(
      (p) => p.id === id
    )

    if (!existingPatient) {
      window.alert('Patient record not found.')
      return
    }

    updatePatient(id, {
      ...existingPatient,

      name,

      referredBy: dreditName.trim(),

      age: editAge,

      gender: editGender,

      collDate: editCollDate,

      collectionDate: editCollDate,

      sampleDate: editCollDate,

      reportDate: editReportDate,
    })

    setEditingId(null)
  }

  /*
  |--------------------------------------------------------------------------
  | DASHBOARD STATS
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | Status is calculated from result values.
  |
  | Any empty parameter = Pending
  | All parameters filled = Completed
  |
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    const total = patients.length

    const pending = patients.filter(
      (p) => !isPatientCompleted(p)
    ).length

    const completed = patients.filter(
      (p) => isPatientCompleted(p)
    ).length

    const todayStr = new Date().toDateString()

    const today = patients.filter(
      (p) =>
        p.createdAt &&
        new Date(p.createdAt).toDateString() ===
          todayStr
    ).length

    return {
      total,
      pending,
      completed,
      today,
    }
  }, [patients])

  /*
  |--------------------------------------------------------------------------
  | FILTER PATIENTS
  |--------------------------------------------------------------------------
  */

  const visiblePatients = useMemo(() => {
    let list = patients

    // Date filter
    if (dateFilter) {
      list = list.filter(
        (p) =>
          (
            p.collDate ||
            p.collectionDate ||
            p.sampleDate
          ) === dateFilter
      )
    }

    // Search filter
    const q = searchQuery
      .trim()
      .toLowerCase()

    if (q) {
      list = list.filter((p) => {
        const patientName = (
          p.name || ''
        ).toLowerCase()

        const doctorName = (
          p.referredBy || ''
        ).toLowerCase()

        return (
          patientName.includes(q) ||
          doctorName.includes(q)
        )
      })
    }

    return list
  }, [
    patients,
    dateFilter,
    searchQuery,
  ])

  /*
  |--------------------------------------------------------------------------
  | PATIENT COUNT ON SELECTED DATE
  |--------------------------------------------------------------------------
  */

  const patientsOnFilteredDate = useMemo(
    () =>
      dateFilter
        ? patients.filter(
            (p) =>
              (
                p.collDate ||
                p.collectionDate ||
                p.sampleDate
              ) === dateFilter
          ).length
        : 0,
    [patients, dateFilter]
  )

  /*
  |--------------------------------------------------------------------------
  | DELETE SINGLE PATIENT
  |--------------------------------------------------------------------------
  */

  const handleDelete = (id, name) => {
    if (
      window.confirm(
        `Delete patient record for "${name}"? This cannot be undone.`
      )
    ) {
      deletePatient(id)
    }
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE ALL PATIENTS
  |--------------------------------------------------------------------------
  */

  const handleDeleteAll = () => {
    const count = patients.length

    if (count === 0) return

    const firstConfirm =
      window.confirm(
        `This will permanently delete ALL ${count} patient record${
          count === 1 ? '' : 's'
        } (pending and completed). This cannot be undone. Continue?`
      )

    if (!firstConfirm) return

    const secondConfirm =
      window.confirm(
        'Are you absolutely sure? Type OK to confirm final deletion of every patient record.'
      )

    if (!secondConfirm) return

    if (
      typeof deleteAllPatients === 'function'
    ) {
      deleteAllPatients()
    } else if (
      typeof deletePatient === 'function'
    ) {
      patients.forEach((p) => {
        deletePatient(p.id)
      })
    } else {
      window.alert(
        'Cannot delete: PatientContext is missing "deleteAllPatients"/"deletePatient".'
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="page">
      <Header />

      <main className="content dash">
        {/* ================================================================
            HERO
        ================================================================= */}

        <div className="dash-hero">
          <div>
            <p className="dash-hero-eyebrow">Dashboard</p>
            <h2 className="dash-h2">
              Overview of patient registrations
            </h2>
            <p className="dash-hero-sub">
              Track every registration, and jump straight to whatever's pending.
            </p>
          </div>

          <button
            className="dash-btn-primary"
            onClick={() =>
              navigate('/patients/new')
            }
          >
            <IconPlus />
            New Patient Entry
          </button>
        </div>

        {/* ================================================================
            STATS — colour-coded cards with icon badges
        ================================================================= */}

        <div className="dash-stat-grid">
          <div className="dash-stat-card is-teal">
            <div className="dash-stat-icon"><IconUsers /></div>
            <div>
              <span className="dash-stat-label">Total Patients</span>
              <span className="dash-stat-value">{stats.total}</span>
              <span className="dash-stat-sub">All-time registrations</span>
            </div>
          </div>

          <div className="dash-stat-card is-amber">
            <div className="dash-stat-icon"><IconClock /></div>
            <div>
              <span className="dash-stat-label">Pending Reports</span>
              <span className="dash-stat-value">{stats.pending}</span>
              <span className="dash-stat-sub">Awaiting test results</span>
            </div>
          </div>

          <div className="dash-stat-card is-green">
            <div className="dash-stat-icon"><IconCheckCircle /></div>
            <div>
              <span className="dash-stat-label">Completed Reports</span>
              <span className="dash-stat-value">{stats.completed}</span>
              <span className="dash-stat-sub">Ready to print / share</span>
            </div>
          </div>

          <div className="dash-stat-card is-gold">
            <div className="dash-stat-icon"><IconCalendar /></div>
            <div>
              <span className="dash-stat-label">Today's Registrations</span>
              <span className="dash-stat-value">{stats.today}</span>
              <span className="dash-stat-sub">
                {formatDate(new Date().toISOString())}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================
            PATIENT PANEL
        ================================================================= */}

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3 className="dash-h3">Patients</h3>

            <div className="dash-filters">
              {/* SEARCH */}

              <div className="dash-search">
                <IconSearch />
                <input
                  type="search"
                  placeholder="Search by patient or doctor name…"
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(
                      e.target.value
                    )
                  }
                />
              </div>

              {/* DATE FILTER */}

              <input
                className="dash-date-input"
                type="date"
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(
                    e.target.value
                  )
                }
              />

              {/* DATE COUNT */}

              {dateFilter && (
                <span className="dash-date-banner">
                  {patientsOnFilteredDate}{' '}
                  patient
                  {patientsOnFilteredDate ===
                  1
                    ? ''
                    : 's'}{' '}
                  on{' '}
                  {formatDate(dateFilter)}

                  <button
                    className="dash-date-clear"
                    onClick={() =>
                      setDateFilter('')
                    }
                  >
                    <IconX />
                  </button>
                </span>
              )}

              {/* DELETE ALL */}

              {patients.length > 0 && (
                <button
                  className="dash-ghost-danger"
                  onClick={
                    handleDeleteAll
                  }
                  title="Permanently delete every patient record"
                >
                  <IconTrash />
                  Delete All
                </button>
              )}
            </div>
          </div>

          {/* ==============================================================
              PATIENT TABLE
          ============================================================== */}

          <table className="dash-table">
            <thead>
              <tr>
                <th>Patient</th>

                <th>Date</th>

                <th>Status</th>

                <th className="dash-th-actions">Actions</th>
              </tr>
            </thead>

            <tbody>
              {/* EMPTY */}

              {visiblePatients.length ===
                0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="dash-empty-row"
                  >
                    {patients.length ===
                    0
                      ? 'No patients registered yet. Click "New Patient Entry" to begin.'
                      : 'No patients match this filter.'}
                  </td>
                </tr>
              )}

              {/* PATIENT ROWS */}

              {visiblePatients.map((p) => {
                const isEditing =
                  editingId === p.id

                /*
                 * IMPORTANT:
                 * Calculate status from actual result values.
                 */

                const patientStatus =
                  getPatientStatus(p)

                const isCompleted =
                  patientStatus ===
                  'completed'

                return (
                  <tr key={p.id}>
                    {/* ====================================================
                        PATIENT
                    ===================================================== */}

                    <td>
                      {!isEditing ? (
                        <div className="dash-patient-cell">
                          <div className={`dash-avatar ${avatarClass(p.name)}`}>
                            {initials(
                              p.name
                            )}
                          </div>

                          <div>
                            <strong className="dash-patient-name">
                              {p.name}
                            </strong>

                            <div className="dash-patient-sub">
                              {p.age
                                ? `${p.age} yrs`
                                : '—'}{' '}
                              ·{' '}
                              {p.gender ||
                                '—'}{' '}
                              · Dr.{' '}
                              {p.referredBy ||
                                'Self'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* ==================================================
                           INLINE EDIT FORM
                        ================================================== */

                        <div className="dash-edit-box">
                          {/* NAME */}

                          <div className="dash-edit-field">
                            <label>
                              Patient Name
                            </label>

                            <input
                              type="text"
                              value={
                                editName
                              }
                              onChange={(
                                e
                              ) =>
                                setEditName(
                                  e.target
                                    .value
                                )
                              }
                              placeholder="Patient Name"
                            />
                          </div>

                          {/* AGE + GENDER */}

                          <div className="dash-edit-row-2">
                            <div className="dash-edit-field">
                              <label>
                                Age
                              </label>

                              <input
                                type="number"
                                value={
                                  editAge
                                }
                                onChange={(
                                  e
                                ) =>
                                  setEditAge(
                                    e.target
                                      .value
                                  )
                                }
                                placeholder="Age"
                              />
                            </div>

                            <div className="dash-edit-field">
                              <label>
                                Gender
                              </label>

                              <select
                                value={
                                  editGender
                                }
                                onChange={(
                                  e
                                ) =>
                                  setEditGender(
                                    e.target
                                      .value
                                  )
                                }
                              >
                                <option value="Male">
                                  Male
                                </option>

                                <option value="Female">
                                  Female
                                </option>

                                <option value="Other">
                                  Child /
                                  Other
                                </option>
                              </select>
                            </div>
                          </div>

                          {/* DOCTOR */}

                          <div className="dash-edit-field">
                            <label>
                              Referred By
                              (Doctor)
                            </label>

                            <input
                              type="text"
                              value={
                                dreditName
                              }
                              onChange={(
                                e
                              ) =>
                                setdrEditName(
                                  e.target
                                    .value
                                )
                              }
                              placeholder="Referred By (Doctor)"
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* ====================================================
                        DATE
                    ===================================================== */}

                    <td>
                      {!isEditing ? (
                        formatDate(
                          p.collDate ||
                            p.collectionDate ||
                            p.sampleDate
                        )
                      ) : (
                        <div className="dash-edit-dates">
                          {/* COLLECTION DATE */}

                          <div className="dash-edit-field">
                            <label>
                              Date
                            </label>

                            <input
                              type="date"
                              value={
                                editCollDate
                              }
                              onChange={(
                                e
                              ) =>
                                setEditCollDate(
                                  e.target
                                    .value
                                )
                              }
                            />
                          </div>

                          {/* REPORT DATE */}

                          <div className="dash-edit-field dash-edit-field-spaced">
                            <label>
                              Report Date
                            </label>

                            <input
                              type="date"
                              value={
                                editReportDate
                              }
                              onChange={(
                                e
                              ) =>
                                setEditReportDate(
                                  e.target
                                    .value
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* ====================================================
                        STATUS
                    ===================================================== */}

                    <td>
                      <span
                        className={`dash-status-pill ${
                          isCompleted
                            ? 'is-completed'
                            : 'is-pending'
                        }`}
                      >
                        <span className="dash-status-dot" />
                        {isCompleted
                          ? 'Completed'
                          : 'Pending'}
                      </span>
                    </td>

                    {/* ====================================================
                        ACTIONS
                    ===================================================== */}

                    <td>
                      <div className="dash-row-actions">
                        {!isEditing ? (
                          <>
                            {/* UPDATE */}

                            <button
                              className="dash-icon-btn"
                              title="Update"
                              onClick={() =>
                                openInlineEdit(
                                  p
                                )
                              }
                            >
                              <IconPencil />
                              
                            </button>

                            {/* RESULTS */}

                            <Link
                              to={`/patients/${p.id}/results`}
                              className={`dash-icon-btn ${
                                isCompleted
                                  ? 'is-blue'
                                  : 'is-green'
                              }`}
                              title={
                                isCompleted
                                  ? 'Edit Results'
                                  : 'Fill Results'
                              }
                            >
                              <IconFile />
                            </Link>

                            {/* DELETE */}

                            <button
                              className="dash-icon-btn is-danger"
                              title="Delete"
                              onClick={() =>
                                handleDelete(
                                  p.id,
                                  p.name
                                )
                              }
                            >
                              <IconTrash />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* SAVE EDIT */}

                            <button
                              className="dash-icon-btn is-save"
                              title="Save"
                              onClick={() =>
                                saveInlineEdit(
                                  p.id
                                )
                              }
                            >
                              <IconCheck />
                            </button>

                            {/* CANCEL EDIT */}

                            <button
                              className="dash-icon-btn"
                              title="Cancel"
                              onClick={
                                cancelInlineEdit
                              }
                            >
                              <IconX />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}