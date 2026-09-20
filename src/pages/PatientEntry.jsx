import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { usePatients } from '../context/PatientContext'
import { CATALOG, ALL_TESTS, resolveRange, individualParamPrice } from '../data/tests'
import BloodGroupSelect from './BloodGroupSelect'
import "./Labpremium.css";

// ==================================================================
// PREMIUM DESIGN TOKENS — same palette as the Dashboard
// (deep green header + gold accents) so this page feels consistent.
// ==================================================================
const PG = {
  deep: '#0b3d2e',
  deepDark: '#082e23',
  gold: '#d99a2b',
  goldSoft: '#fdf1dd',
  goldLine: '#ecd7ab',
  cream: '#f6f3ec',
}

const PG_ACCENTS = [
  { border: '#0b3d2e', bg: '#e7f2ec', text: '#0b3d2e' }, // green
  { border: '#d99a2b', bg: '#fdf1dd', text: '#8a5a12' }, // gold
  { border: '#6d4fc4', bg: '#efeaff', text: '#5636a8' }, // purple
]

function getAccent(index) {
  return PG_ACCENTS[index % PG_ACCENTS.length]
}

function initialOf(label) {
  return label ? label.trim().charAt(0).toUpperCase() : '?'
}

// ==================================================================
// SEROLOGY VISIBILITY — the "Serology Dates" checkbox only makes
// sense for a couple of tests (e.g. Mantoux). Edit this list so the
// label(s) match exactly what's in data/tests.js for your catalog.
// ==================================================================
const SEROLOGY_TEST_LABELS = ['Mantoux Test']

function isSerologyEnabledTest(test) {
  return SEROLOGY_TEST_LABELS.some(
    (name) => test.label.trim().toLowerCase() === name.trim().toLowerCase()
  )
}

const PREMIUM_CSS = `
.lab-premium-v2 input[type="text"],
.lab-premium-v2 input[type="number"],
.lab-premium-v2 input[type="date"],
.lab-premium-v2 input[type="search"],
.lab-premium-v2 select,
.lab-premium-v2 textarea {
  transition: border-color .15s ease, box-shadow .15s ease;
}
.lab-premium-v2 input[type="text"]:focus,
.lab-premium-v2 input[type="number"]:focus,
.lab-premium-v2 input[type="date"]:focus,
.lab-premium-v2 input[type="search"]:focus,
.lab-premium-v2 select:focus,
.lab-premium-v2 textarea:focus {
  outline: none;
  border-color: ${PG.gold} !important;
  box-shadow: 0 0 0 3px ${PG.goldSoft};
}
.pg-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e8e5dc;
  box-shadow: 0 4px 16px rgba(11,61,46,0.05);
}
.pg-test-card {
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  position: relative;
  overflow: hidden;
}
.pg-test-card:hover {
  transform: translateY(-3px);
}
.pg-btn-gold {
  background: ${PG.gold};
  color: #fff;
  border: none;
  transition: filter .15s ease, transform .15s ease;
}
.pg-btn-gold:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}
.pg-btn-outline-deep {
  background: #fff;
  color: ${PG.deep};
  border: 1.5px solid ${PG.deep};
  transition: background .15s ease;
}
.pg-btn-outline-deep:hover:not(:disabled) {
  background: ${PG.goldSoft};
}
`

/*
|--------------------------------------------------------------------------
| Hero banner, matching the Dashboard's dark-green header
|--------------------------------------------------------------------------
*/
function PremiumHero({ eyebrow, title, subtitle, action }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${PG.deep} 0%, #124a37 55%, ${PG.deepDark} 100%)`,
        borderRadius: '20px',
        padding: '30px 34px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 14px 32px rgba(11,61,46,0.22)',
      }}
    >
      <div>
        <span style={{ color: '#e3a83b', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          {eyebrow}
        </span>
        <h2 style={{ fontFamily: 'Georgia, "Playfair Display", serif', color: '#fff', fontSize: '1.85rem', margin: '6px 0 4px', fontWeight: 700 }}>
          {title}
        </h2>
        {subtitle && <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '0.95rem' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ==================================================================
// FONT SIZE CONTROL — floating "Aa" widget, dashboard-gold themed.
// Applied as CSS zoom on <main> only, so the control itself never
// changes size. Value is remembered (localStorage) across both
// Patient Entry and Test Results pages.
// ==================================================================
const FONT_SCALE_KEY = 'labpremium_font_scale'
const FONT_SCALE_MIN = 0.85
const FONT_SCALE_MAX = 1.4
const FONT_SCALE_STEP = 0.05
const FONT_SCALE_DEFAULT = 1

function readSavedFontScale() {
  if (typeof window === 'undefined') return FONT_SCALE_DEFAULT
  const saved = window.localStorage.getItem(FONT_SCALE_KEY)
  const num = Number(saved)
  return saved && !Number.isNaN(num) ? num : FONT_SCALE_DEFAULT
}

// Discrete "levels" shown to the user (1, 2, 3…) instead of raw percentages —
// maps cleanly onto the FONT_SCALE_MIN..MAX / STEP range.
function scaleToLevel(scale) {
  return Math.round((scale - FONT_SCALE_MIN) / FONT_SCALE_STEP) + 1
}

function FontScaleControl({ fontScale, onIncrease, onDecrease, onReset }) {
  const level = scaleToLevel(fontScale)
  const maxLevel = scaleToLevel(FONT_SCALE_MAX)

  return (
    <div
      style={{
        position: 'fixed', top: '18px', right: '18px', zIndex: 999,
        display: 'flex', alignItems: 'center', gap: '10px',
        background: `linear-gradient(135deg, #ffffff 0%, ${PG.goldSoft} 100%)`,
        border: `1.5px solid ${PG.goldLine}`,
        borderRadius: '999px',
        padding: '8px 14px',
        boxShadow: '0 10px 28px rgba(11,61,46,0.18), 0 2px 6px rgba(217,154,43,0.15)',
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '30px', height: '30px', borderRadius: '50%',
        background: `linear-gradient(135deg, ${PG.deep} 0%, ${PG.deepDark} 100%)`,
        color: PG.gold, fontWeight: 800, fontSize: '0.95rem', fontFamily: 'Georgia, "Playfair Display", serif',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15)',
      }}>
        Aa
      </span>

      <button type="button" onClick={onDecrease} title="Decrease font size" disabled={fontScale <= FONT_SCALE_MIN}
        style={{
          width: '28px', height: '28px', borderRadius: '50%', border: `1px solid ${PG.goldLine}`,
          background: '#fff', color: PG.deep, fontWeight: 800, fontSize: '1rem', lineHeight: 1,
          cursor: fontScale <= FONT_SCALE_MIN ? 'not-allowed' : 'pointer',
          opacity: fontScale <= FONT_SCALE_MIN ? 0.4 : 1,
          boxShadow: '0 2px 6px rgba(11,61,46,0.1)',
        }}>
        −
      </button>

      <span
        title={`Level ${level} of ${maxLevel}`}
        style={{
          display: 'flex', alignItems: 'baseline', gap: '3px',
          fontWeight: 800, color: PG.deep, minWidth: '46px', justifyContent: 'center',
          fontFamily: 'Georgia, "Playfair Display", serif',
        }}
      >
        <span style={{ fontSize: '1.35rem', letterSpacing: '-0.02em' }}>{level}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: PG.gold }}>/{maxLevel}</span>
      </span>

      <button type="button" onClick={onIncrease} title="Increase font size" disabled={fontScale >= FONT_SCALE_MAX}
        style={{
          width: '28px', height: '28px', borderRadius: '50%', border: `1px solid ${PG.goldLine}`,
          background: '#fff', color: PG.deep, fontWeight: 800, fontSize: '1rem', lineHeight: 1,
          cursor: fontScale >= FONT_SCALE_MAX ? 'not-allowed' : 'pointer',
          opacity: fontScale >= FONT_SCALE_MAX ? 0.4 : 1,
          boxShadow: '0 2px 6px rgba(11,61,46,0.1)',
        }}>
        +
      </button>

      <button type="button" onClick={onReset} title="Reset font size"
        style={{
          marginLeft: '2px', fontSize: '0.72rem', fontWeight: 700, color: '#fff',
          background: `linear-gradient(135deg, ${PG.gold} 0%, #c07f1a 100%)`,
          border: 'none', borderRadius: '999px', padding: '6px 12px', cursor: 'pointer',
          boxShadow: '0 3px 8px rgba(217,154,43,0.35)',
        }}>
        Reset
      </button>
    </div>
  )
}

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

/*
|--------------------------------------------------------------------------
| Premium test-selection card — redesigned to match the dashboard's
| stat-card language: icon chip in a soft tint, a thin colored rail
| flush to the left edge, and a solid price pill instead of an outline.
|--------------------------------------------------------------------------
*/
function TestCard({
  test,
  accent,
  selectedKeys,
  onToggleFull,
  onToggleParam,
  gender,
  searchActive,
  serologyKeys,
  onToggleSerology
}) {
  const [manualOpen, setManualOpen] = useState(false)
  const open = manualOpen || searchActive
  const total = test.params.length
  const selCount = selectedKeys.length
  const isFull = selCount === total
  const isPartial = selCount > 0 && !isFull
  const perParamPrice = individualParamPrice(test)
  const canSplit = total > 1
  const isAnySelected = isFull || isPartial
  const serologyEnabled = isSerologyEnabledTest(test)

  const isAllSerologyChecked = isAnySelected && selectedKeys.every(k => serologyKeys.includes(k))

  return (
    <div
      className={`test-card pg-test-card ${isAnySelected ? 'checked' : ''}`}
      style={{
        border: `1px solid ${isAnySelected ? accent.border + '55' : '#eae7de'}`,
        borderRadius: '16px',
        background: isAnySelected ? accent.bg : '#fff',
        padding: '16px 18px 16px 22px',
        boxShadow: isAnySelected
          ? `0 10px 24px -10px ${accent.border}4d`
          : '0 1px 3px rgba(11,61,46,0.04)',
      }}
    >
      <span aria-hidden="true" style={{
        position: 'absolute', left: 0, top: '14px', bottom: '14px', width: '4px',
        borderRadius: '4px', background: accent.border,
      }} />

      <label className="test-card-main" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
        <span style={{
          width: '38px', height: '38px', minWidth: '38px', borderRadius: '12px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: accent.bg,
          border: `1px solid ${accent.border}2e`,
          color: accent.text, fontWeight: 800, fontSize: '0.9rem',
        }}>
          {initialOf(test.label)}
        </span>

        <input
          type="checkbox"
          checked={isFull}
          ref={(el) => { if (el) el.indeterminate = isPartial }}
          onChange={() => onToggleFull(test)}
          style={{ accentColor: accent.border, width: '17px', height: '17px', cursor: 'pointer' }}
        />
        <span className="test-name" style={{ flex: 1, fontWeight: 700, color: '#1f2937', fontSize: '0.95rem' }}>{test.label}</span>
        <span className="test-price" style={{
          fontSize: '0.78rem', fontWeight: 700, color: '#fff', background: accent.border,
          borderRadius: '999px', padding: '5px 12px', whiteSpace: 'nowrap',
        }}>
          {isPartial ? `₹${perParamPrice * selCount} · ${selCount}/${total}` : `₹${test.price}`}
        </span>
      </label>

      {isAnySelected && serologyEnabled && (
        <label className="serology-toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', paddingLeft: '50px' }}>
          <input type="checkbox" checked={isAllSerologyChecked} onChange={() => onToggleSerology(test.key, null)} style={{ accentColor: accent.border }} />
          <span className="serology-toggle-text" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Include Serology dates
          </span>
        </label>
      )}

      {canSplit && (
        <button
          type="button"
          className="test-card-toggle"
          onClick={() => setManualOpen((o) => !o)}
          style={{
            marginTop: '10px', fontSize: '0.78rem', fontWeight: 700, color: accent.text,
            background: 'transparent', border: 'none', cursor: 'pointer', paddingLeft: '50px',
          }}
        >
          {open ? '▲ Hide individual parameters' : `▼ Or pick individual parameters (₹${perParamPrice} each)`}
        </button>
      )}

      {open && canSplit && (
        <div className="param-checklist" style={{ marginTop: '8px', paddingLeft: '50px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {test.params.map((p) => {
            const isParamSel = selectedKeys.includes(p.key);
            const isParamSerology = serologyKeys.includes(p.key);

            return (
              <div key={p.key} className="param-row-wrapper" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
                gap: '8px',
                background: isParamSel ? accent.bg : '#fff',
                border: `1px solid ${isParamSel ? accent.border + '55' : '#eee'}`,
                borderRadius: '8px', padding: '6px 10px',
                transition: 'background .15s ease, border-color .15s ease',
              }}>
                <label className="param-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isParamSel} onChange={() => onToggleParam(test, p.key)} style={{ accentColor: accent.border }} />
                  <div>
                    <span className="param-name-text" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1f2937' }}>{p.name}</span>{' '}
                    <span className="param-range muted small" style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                      {resolveRange(p.range, gender)} {p.unit}
                    </span>
                  </div>
                </label>

                {isParamSel && serologyEnabled && (
                  <label className="serology-param-toggle" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#6b7280' }}>
                    <input type="checkbox" checked={isParamSerology} onChange={() => onToggleSerology(test.key, p.key)} style={{ accentColor: accent.border }} />
                    <span>Serology Dates</span>
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default function PatientEntry() {
  const { addPatient } = usePatients()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', age: '', gender: 'Male', referredBy: 'self',
    sampleDate: todayISO(), reportDate: todayISO(),
  })
  const [ageNA, setAgeNA] = useState(false)
  const [selections, setSelections] = useState({})
  const [serologySelections, setSerologySelections] = useState({})
  const [errors, setErrors] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  // FONT SIZE CONTROL
  const [fontScale, setFontScale] = useState(readSavedFontScale)
  const applyFontScale = (next) => {
    const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, next))
    setFontScale(clamped)
    if (typeof window !== 'undefined') window.localStorage.setItem(FONT_SCALE_KEY, String(clamped))
  }
  const increaseFontScale = () => applyFontScale(fontScale + FONT_SCALE_STEP)
  const decreaseFontScale = () => applyFontScale(fontScale - FONT_SCALE_STEP)
  const resetFontScale = () => applyFontScale(FONT_SCALE_DEFAULT)

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredCatalog = useMemo(() => {
    if (!normalizedQuery) return CATALOG
    return CATALOG.map((cat) => ({
      ...cat,
      tests: cat.tests.filter(
        (t) =>
          t.label.toLowerCase().includes(normalizedQuery) ||
          (t.shortLabel && t.shortLabel.toLowerCase().includes(normalizedQuery)) ||
          t.params.some((p) => p.name.toLowerCase().includes(normalizedQuery) || p.key.toLowerCase().includes(normalizedQuery))
      ),
    })).filter((cat) => cat.tests.length > 0)
  }, [normalizedQuery])

  const updateField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const toggleAgeNA = () => {
    setAgeNA((prev) => {
      const next = !prev
      setForm((f) => ({ ...f, age: next ? 'NA' : '' }))
      return next
    })
  }

  const toggleFull = (test) => {
    setSelections((prev) => {
      const cur = prev[test.key] || []
      const isFull = cur.length === test.params.length
      if (isFull) {
        setSerologySelections((s) => {
          const updated = { ...s }
          delete updated[test.key]
          return updated
        })
      }
      return { ...prev, [test.key]: isFull ? [] : test.params.map((p) => p.key) }
    })
  }

  const toggleParam = (test, paramKey) => {
    setSelections((prev) => {
      const cur = prev[test.key] || []
      const isSelected = cur.includes(paramKey)
      const next = isSelected ? cur.filter((k) => k !== paramKey) : [...cur, paramKey]
      if (isSelected) {
        setSerologySelections((s) => {
          const updated = { ...s }
          if (updated[test.key]) updated[test.key] = updated[test.key].filter(k => k !== paramKey)
          return updated
        })
      }
      return { ...prev, [test.key]: next }
    })
  }

  const toggleSerology = (testKey, paramKey) => {
    setSerologySelections((prev) => {
      const currentSels = prev[testKey] || []
      const activeSelectedParams = selections[testKey] || []
      if (paramKey === null) {
        const allAreSerology = activeSelectedParams.every(k => currentSels.includes(k))
        return { ...prev, [testKey]: allAreSerology ? [] : [...activeSelectedParams] }
      } else {
        const exists = currentSels.includes(paramKey)
        const nextSerology = exists ? currentSels.filter(k => k !== paramKey) : [...currentSels, paramKey]
        return { ...prev, [testKey]: nextSerology }
      }
    })
  }

  const lineItems = useMemo(() => {
    const items = []
    for (const test of ALL_TESTS) {
      const sel = selections[test.key] || []
      if (sel.length === 0) continue
      const full = sel.length === test.params.length
      const params = test.params
        .filter((p) => sel.includes(p.key))
        .map((p) => ({
          key: p.key, name: p.name, unit: p.unit, range: resolveRange(p.range, form.gender),
          isSerology: (serologySelections[test.key] || []).includes(p.key)
        }))
      items.push({
        id: test.key, catHead: test.catHead, label: test.label, full,
        price: full ? test.price : individualParamPrice(test) * sel.length, params,
      })
    }
    return items
  }, [selections, serologySelections, form.gender])

  // Total is still computed (needed when saving the patient record),
  // it's just no longer shown in this page's UI.
  const totalAmount = useMemo(() => lineItems.reduce((sum, i) => sum + i.price, 0), [lineItems])

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'Patient name is required.'
    if (!ageNA && (!form.age || Number(form.age) <= 0)) next.age = 'Enter a valid age.'
    if (lineItems.length === 0) next.tests = 'Select at least one test or parameter.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const id = addPatient({ ...form, tests: lineItems, totalAmount })
    navigate(`/patients/${id}/results`)
  }

  const fieldLabelStyle = { fontWeight: '700', color: PG.deep, fontSize: '0.98rem', letterSpacing: '0.02em', marginBottom: '8px', display: 'block' }
  const fieldInputStyle = { width: '100%', padding: '11px 14px', border: '1px solid var(--line)', borderRadius: '10px', fontSize: '1.05rem', color: '#1f2937', fontWeight: 500 }

  return (
    <div className="page lab-premium lab-premium-v2">
      <style>{PREMIUM_CSS}</style>
      <Header />

      <FontScaleControl fontScale={fontScale} onIncrease={increaseFontScale} onDecrease={decreaseFontScale} onReset={resetFontScale} />

      <main className="content" style={{ zoom: fontScale, background: PG.cream, padding: '24px', borderRadius: '20px' }}>
        <PremiumHero
          eyebrow="New Registration"
          title="New Patient Entry"
          subtitle="Register a patient and select the diagnostic tests."
          action={
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.35)',
                color: '#fff', padding: '10px 18px', borderRadius: '999px', fontWeight: 600,
                fontSize: '0.88rem', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              ← Back to Dashboard
            </button>
          }
        />

        <form className="panel form-panel pg-panel" style={{ padding: '24px' }} onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label style={fieldLabelStyle}>Patient Name *</label>
              <input placeholder="Full name" value={form.name} onChange={updateField('name')}
                style={fieldInputStyle} />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="field">
              <label style={fieldLabelStyle}>Age *</label>
              <input
                type="number" min="0" placeholder="e.g. 34"
                value={ageNA ? '' : form.age} onChange={updateField('age')} disabled={ageNA}
                style={fieldInputStyle}
              />
              <label className="age-na-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <input type="checkbox" checked={ageNA} onChange={toggleAgeNA} style={{ accentColor: PG.gold }} />
                <span className="muted small">Age not known (NA)</span>
              </label>
              {errors.age && <span className="field-error">{errors.age}</span>}
            </div>

            <div className="field">
              <label style={fieldLabelStyle}>Gender *</label>
              <select value={form.gender} onChange={updateField('gender')}
                style={fieldInputStyle}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div className="field">
              <label style={fieldLabelStyle}>Referred By (Doctor)</label>
              <div className="referred-by-group" style={{ display: 'flex', gap: '8px' }}>
                <input
                  placeholder="Type Doctor Name or Select Below"
                  value={form.referredBy} onChange={updateField('referredBy')}
                  style={{ ...fieldInputStyle, flex: 1, width: 'auto' }}
                />
                <select
                  value={form.referredBy}
                  onChange={(e) => { if (e.target.value) setForm((f) => ({ ...f, referredBy: e.target.value })) }}
                  style={{ ...fieldInputStyle, width: 'auto' }}
                >
                  <option value="">-- Choose Preset Doctor --</option>
                  <option value="self">self</option>
                  <option value="Dr. bhanu patel">Dr. bhanu patel</option>
                  <option value="Dr. rajesh patel">Dr. rajesh patel</option>
                  <option value="Dr. amit tiwari">Dr. amit tiwari</option>
                  <option value="Dr. sashank">Dr. sashank</option>
                  <option value="Dr. arvind polyclinic">Dr. arvind polyclinic</option>
                  <option value="Dr. n. pandey mbbs">Dr. n. pandey mbbs</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label style={fieldLabelStyle}>Sample Collection Date</label>
              <input type="date" value={form.sampleDate} onChange={updateField('sampleDate')}
                style={fieldInputStyle} />
            </div>

            <div className="field">
              <label style={fieldLabelStyle}>Report Date</label>
              <input type="date" value={form.reportDate} onChange={updateField('reportDate')}
                style={fieldInputStyle} />
            </div>
          </div>

          <h3 className="section-title" style={{
            fontFamily: 'Georgia, "Playfair Display", serif', color: PG.deep, fontSize: '1.3rem', marginTop: '28px',
          }}>
            Select Tests
          </h3>

          <div style={{ position: 'relative', marginBottom: '6px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.95rem' }}>🔍</span>
            <input
              type="search"
              className="test-search-box"
              placeholder="Search a test (e.g. Blood Group, CBC, KFT)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '11px 14px 11px 38px', border: '1px solid var(--line)', borderRadius: '999px' }}
            />
          </div>
          {errors.tests && <span className="field-error">{errors.tests}</span>}

          {filteredCatalog.map((cat, catIdx) => (
            <div key={cat.head} className="test-category" style={{ marginTop: '22px' }}>
              <h4 className="test-category-title" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', color: PG.deep,
                fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px',
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getAccent(catIdx).border, display: 'inline-block' }} />
                {cat.head}
              </h4>
              <div className="test-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {cat.tests.map((test) => (
                  <TestCard
                    key={test.key}
                    test={{ ...test, catHead: cat.head }}
                    accent={getAccent(catIdx)}
                    selectedKeys={selections[test.key] || []}
                    onToggleFull={toggleFull}
                    onToggleParam={toggleParam}
                    gender={form.gender}
                    searchActive={!!normalizedQuery}
                    serologyKeys={serologySelections[test.key] || []}
                    onToggleSerology={toggleSerology}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '26px' }}>
            <button type="submit" className="pg-btn-gold" style={{ padding: '12px 26px', fontSize: '1rem', fontWeight: 700, borderRadius: '999px', cursor: 'pointer' }}>
              Save &amp; Continue to Test Results →
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}