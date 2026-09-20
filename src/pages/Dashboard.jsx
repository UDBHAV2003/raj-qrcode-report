import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import Header from '../components/Header'
import { usePatients } from '../context/PatientContext'
// NOTE: adjust this import path to wherever ReportDocument.jsx actually
// lives in your project (e.g. '../pdf/ReportDocument' or
// '../reports/ReportDocument') — prepareReportCodes attaches the QR /
// barcode data URLs before we hand the patient to the PDF renderer.
import ReportDocument, { prepareReportCodes } from '../components/ReportDocument'
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
const IconWhatsapp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.05-1.36A10 10 0 1 0 12 2Zm0 18.2a8.16 8.16 0 0 1-4.17-1.14l-.3-.18-3 .81.8-2.93-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.14c-.24-.12-1.44-.71-1.66-.79s-.38-.12-.55.12-.63.79-.78.95-.28.18-.52.06a6.7 6.7 0 0 1-3.33-2.91c-.25-.43.25-.4.72-1.33a.46.46 0 0 0-.02-.43c-.06-.12-.55-1.33-.76-1.82s-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.85 2 4.77 4.77 0 0 0 1 2.52 10.9 10.9 0 0 0 4.18 3.7c1.51.65 2.1.71 2.85.6a2.43 2.43 0 0 0 1.6-1.13 1.94 1.94 0 0 0 .13-1.13c-.06-.1-.22-.16-.46-.28Z" />
  </svg>
)
const IconSpinner = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dash-spin">
    <path d="M21 12a9 9 0 1 1-9-9" />
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

  // ----------------------------------------------------------------------
  // REPORT BUTTON (single icon next to the patient name -> always
  // generates + downloads the letterhead version of the report PDF)
  // ----------------------------------------------------------------------

  const [generatingReportId, setGeneratingReportId] = useState(null)

  const [readyReportId, setReadyReportId] = useState(null)

  const readyTimeoutRef = useRef(null)

  // Clear any pending "just downloaded" tick timer on unmount.
  useEffect(() => {
    return () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current)
      }
    }
  }, [])

  /*
  |--------------------------------------------------------------------------
  | GENERATE + DOWNLOAD REPORT PDF (with or without letterhead)
  |--------------------------------------------------------------------------
  */

  // Small helper: trigger a normal browser download for a Blob/File.
  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  // Builds the (letterhead) report PDF for a patient and returns it as a
  // File, ready to hand to navigator.share() or to download. Shared by
  // both share entry points below so the PDF-generation logic lives in
  // exactly one place.
  const generatePatientReportFile = async (patient) => {
    const withLetterhead = true

    let patientWithCodes
    try {
      patientWithCodes = await prepareReportCodes(patient, {
        forceLetterheadParam: withLetterhead,
      })
    } catch (codeErr) {
      // QR/barcode generation failed (e.g. canvas unavailable). Don't
      // let that take the whole thing down — fall back to the plain
      // patient object so the report still generates, just without the
      // QR/barcode images.
      console.error(
        'prepareReportCodes failed, continuing without QR/barcode:',
        codeErr
      )
      patientWithCodes = patient
    }

    // Belt-and-braces: prepareReportCodes should never resolve to
    // something falsy, but if it somehow does, fall back to the raw
    // patient rather than handing ReportDocument `undefined`.
    if (!patientWithCodes) {
      patientWithCodes = patient
    }

    const blob = await pdf(
      <ReportDocument patient={patientWithCodes} withLetterhead={withLetterhead} />
    ).toBlob()

    const safeName = (patient.name || 'patient').trim().replace(/\s+/g, '_')
    const fileName = `${safeName}_report_letterhead.pdf`

    return new File([blob], fileName, { type: 'application/pdf' })
  }

  const flashReady = (patientId) => {
    setReadyReportId(patientId)
    if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current)
    readyTimeoutRef.current = setTimeout(() => setReadyReportId(null), 3200)
  }

  /*
  |--------------------------------------------------------------------------
  | SHARE — always opens WhatsApp Web
  |--------------------------------------------------------------------------
  | IMPORTANT LIMITATION: neither wa.me nor api.whatsapp.com links accept
  | a file — no website (not even WhatsApp itself) can auto-attach a file
  | into the WhatsApp Web chat box, only pre-filled TEXT. So the flow is:
  | generate the PDF, download it, then open web.whatsapp.com with a
  | pre-filled message — the user attaches the just-downloaded PDF with
  | one click on the paperclip. There's no code-only way around that.
  |
  | The WhatsApp Web tab is opened SYNCHRONOUSLY (before the PDF/await
  | below) and its location is set once ready — opening it only after an
  | `await` would make most browsers treat it as a popup and block it.
  |--------------------------------------------------------------------------
  */

  const handleWhatsAppShare = async (patient) => {
    if (generatingReportId) return

    if (!patient || !patient.id) {
      console.error('handleWhatsAppShare called without a valid patient:', patient)
      window.alert('No patient selected for this report.')
      return
    }

    // Open the tab right away (still inside the click's user-gesture),
    // and fill it in once the PDF is ready — avoids popup blockers.
    // NOTE: no 'noopener' here — that flag makes window.open() return
    // null, which is exactly what was leaving the tab stuck on
    // about:blank (we had no reference left to redirect it with).
    const waWindow = window.open('about:blank', '_blank')

    setGeneratingReportId(patient.id)

    try {
      const file = await generatePatientReportFile(patient)

      // Download it first so it's sitting in Downloads, ready to attach.
      downloadBlob(file, file.name)

      const message = `Lab report for ${
        patient.name || 'patient'
      } — Raj Pathology Center.\nPDF "${file.name}" has been downloaded — please attach it here.`

      const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(
        message
      )}`

      if (waWindow) {
        waWindow.location.href = whatsappUrl
      } else {
        // Popup was genuinely blocked despite opening synchronously
        // (rare) — try once more directly.
        window.open(whatsappUrl, '_blank')
      }

      flashReady(patient.id)
    } catch (err) {
      console.error('Failed to generate report PDF:', err)
      if (waWindow) waWindow.close()
      window.alert('Could not generate the report PDF. Please try again.')
    } finally {
      setGeneratingReportId(null)
    }
  }

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

                <th>Report</th>

                <th className="dash-th-actions">Actions</th>
              </tr>
            </thead>

            <tbody>
              {/* EMPTY */}

              {visiblePatients.length ===
                0 && (
                <tr>
                  <td
                    colSpan={5}
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
                        REPORT — standalone share/download box
                    ===================================================== */}

                    <td>
                      <button
                        className={`dash-report-whatsapp-btn ${
                          readyReportId === p.id ? 'is-ready' : ''
                        }`}
                        title={
                          generatingReportId === p.id
                            ? 'Preparing…'
                            : readyReportId === p.id
                            ? 'Downloaded — attach it in the WhatsApp tab'
                            : 'Download report + open WhatsApp Web'
                        }
                        disabled={generatingReportId === p.id}
                        onClick={() => handleWhatsAppShare(p)}
                      >
                        {generatingReportId === p.id ? (
                          <IconSpinner />
                        ) : readyReportId === p.id ? (
                          <IconCheck />
                        ) : (
                          <IconWhatsapp />
                        )}
                      </button>
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