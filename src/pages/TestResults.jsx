import React, { useState, useMemo } from 'react'
import {
  useNavigate,
  useParams,
  Navigate,
  Link,
} from 'react-router-dom'

import Header from '../components/Header'
import { usePatients } from '../context/PatientContext'
import {
  findTest,
  computeCalculated,
  ALL_TESTS,
  resolveRange,
} from '../data/tests'
import BloodGroupSelect from './BloodGroupSelect'
import "./Labpremium.css";

const QUALITATIVE_SUGGESTIONS = [
  'Negative', 'Positive', 'Reactive', 'Non Reactive',
  'Nil', 'Trace', 'Present', 'Absent',
]

// ==================================================================
// PREMIUM DESIGN TOKENS
// Same palette as the Dashboard (deep green + gold), so this page
// feels like part of the same premium product.
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

const PREMIUM_CSS = `
.lab-premium-v2 input[type="text"]:not(.result-input),
.lab-premium-v2 input[type="number"]:not(.result-input),
.lab-premium-v2 input[type="date"]:not(.result-input),
.lab-premium-v2 input[type="search"]:not(.result-input),
.lab-premium-v2 select:not(.result-input),
.lab-premium-v2 textarea:not(.result-input) {
  transition: border-color .15s ease, box-shadow .15s ease;
}
.lab-premium-v2 input[type="text"]:not(.result-input):focus,
.lab-premium-v2 input[type="number"]:not(.result-input):focus,
.lab-premium-v2 input[type="date"]:not(.result-input):focus,
.lab-premium-v2 input[type="search"]:not(.result-input):focus,
.lab-premium-v2 select:not(.result-input):focus,
.lab-premium-v2 textarea:not(.result-input):focus {
  outline: none;
  border-color: ${PG.gold} !important;
  box-shadow: 0 0 0 3px ${PG.goldSoft};
}
.lab-premium-v2 .result-input:focus {
  outline: none;
  border: 2px solid #000000 !important;
  box-shadow: none !important;
}
.pg-panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e8e5dc;
  box-shadow: 0 4px 16px rgba(11,61,46,0.05);
}
.pg-test-card {
  transition: transform .15s ease, box-shadow .15s ease;
}
.pg-test-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(11,61,46,0.1);
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
        <span
          style={{
            color: '#e3a83b',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </span>
        <h2
          style={{
            fontFamily: 'Georgia, "Playfair Display", serif',
            color: '#fff',
            fontSize: '1.85rem',
            margin: '6px 0 4px',
            fontWeight: 700,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '0.95rem' }}>
            {subtitle}
          </p>
        )}
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

function isQualitativeRange(range) {
  return !!range && !/\d/.test(range)
}

function searchableValue(value) {
  if (value === undefined || value === null) return ''
  return String(value).toLowerCase()
}

function getParentSearchText(test) {
  return [test?.label, test?.shortLabel, test?.catHead, test?.key, test?.category, test?.description]
    .filter(Boolean).map(searchableValue).join(' ')
}

function getChildSearchText(param) {
  return [param?.name, param?.key, param?.unit, param?.method, param?.range, param?.description, param?.type]
    .filter(Boolean).map(searchableValue).join(' ')
}

function testMatchesSearch(test, searchWords) {
  if (!searchWords.length) return false
  const parentText = getParentSearchText(test)
  const childText = (test?.params || []).map(getChildSearchText).join(' ')
  const completeSearchText = `${parentText} ${childText}`.toLowerCase()
  return searchWords.every((word) => completeSearchText.includes(word))
}

function getMatchingChildParams(catalogTest, searchWords) {
  if (!catalogTest || !searchWords.length) return []
  return (catalogTest.params || []).filter((param) => {
    const childText = getChildSearchText(param)
    return searchWords.every((word) => childText.includes(word))
  })
}

// ---------------------------------------------------------------------
// FIX: Firestore's setDoc() throws if ANY nested field value is
// `undefined` (e.g. "Unsupported field value: undefined"). Rather than
// hunting down every place a field could end up undefined (catalog data
// changes over time, new params get added, etc.), this recursively walks
// the whole save payload right before it goes to saveTestResults and
// swaps undefined -> null, which Firestore accepts fine.
// ---------------------------------------------------------------------
function sanitizeForFirestore(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeForFirestore)
  }
  if (value && typeof value === 'object') {
    const clean = {}
    for (const [key, val] of Object.entries(value)) {
      clean[key] = val === undefined ? null : sanitizeForFirestore(val)
    }
    return clean
  }
  return value
}

export default function TestResults() {
  const { id } = useParams()
  // FIX: use the combined saveTestResults instead of separate
  // saveResults + updatePatient calls (see handleSave below for why).
  const { getPatient, saveTestResults } = usePatients()
  const navigate = useNavigate()
  const patient = getPatient(id)

  const [tests, setTests] = useState(patient?.tests || [])

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

  // SEARCH & ADD MORE TESTS
  const [testSearch, setTestSearch] = useState('')
  const [expandedTestKey, setExpandedTestKey] = useState(null)
  const [individualPicks, setIndividualPicks] = useState({})

  const searchWords = useMemo(() => {
    return testSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
  }, [testSearch])

  const filteredCatalogTests = useMemo(() => {
    if (!searchWords.length) return []
    return ALL_TESTS.filter((test) => testMatchesSearch(test, searchWords))
  }, [searchWords])

  const getSearchMatchingChildren = (catalogTest) => getMatchingChildParams(catalogTest, searchWords)

  const getAddedParamKeysForTest = (testKey) => {
    const existing = tests.find((t) => t.id === testKey)
    return existing ? new Set(existing.params.map((p) => p.key)) : new Set()
  }

  const addParamsToTest = (catalogT, keysToAdd) => {
    const alreadyAdded = getAddedParamKeysForTest(catalogT.key)
    const newKeys = keysToAdd.filter((key) => !alreadyAdded.has(key))
    if (newKeys.length === 0) return

    // FIX: Firestore's setDoc() rejects `undefined` field values outright
    // ("Unsupported field value: undefined"). Several catalog fields
    // (method, isSerology, hasInduration, reportBlock, bold) are often
    // simply absent on a given param, which made these come through as
    // literal `undefined` here. Using `??` gives every field a safe
    // Firestore-legal default (null / false) instead.
    const paramsToAdd = catalogT.params
      .filter((param) => newKeys.includes(param.key))
      .map((param) => ({
        key: param.key,
        name: param.name,
        unit: param.unit || '',
        range: resolveRange(param.range, patient.gender),
        method: param.method ?? null,
        isSerology: param.isSerology ?? false,
        hasInduration: param.hasInduration ?? false,
        reportBlock: param.reportBlock ?? null,
        bold: param.bold ?? false,
      }))

    setTests((prev) => {
      const idx = prev.findIndex((t) => t.id === catalogT.key)
      if (idx === -1) {
        const isFullNow = paramsToAdd.length === catalogT.params.length
        return [...prev, { id: catalogT.key, label: catalogT.label, full: isFullNow, params: paramsToAdd }]
      }
      const next = [...prev]
      const existing = next[idx]
      const mergedParams = [...existing.params, ...paramsToAdd]
      const isFullNow = mergedParams.length === catalogT.params.length
      next[idx] = { ...existing, full: isFullNow, params: mergedParams }
      return next
    })

    setValues((prev) => {
      const testValues = prev[catalogT.key] || { params: {}, paramDates: {}, paramInduration: {} }
      const newParamsObj = { ...testValues.params }
      const newParamDates = { ...testValues.paramDates }
      const newParamInduration = { ...testValues.paramInduration }
      newKeys.forEach((key) => {
        if (newParamsObj[key] === undefined) newParamsObj[key] = ''
        if (!newParamDates[key]) newParamDates[key] = { testingDate: '', readingDate: '' }
        if (newParamInduration[key] === undefined) newParamInduration[key] = ''
      })
      return { ...prev, [catalogT.key]: { params: newParamsObj, paramDates: newParamDates, paramInduration: newParamInduration } }
    })
  }

  const handleToggleTest = (catalogT, checked) => {
    if (checked) {
      addParamsToTest(catalogT, catalogT.params.map((param) => param.key))
    } else {
      setTests((prev) => prev.filter((test) => test.id !== catalogT.key))
      setValues((prev) => {
        const next = { ...prev }
        delete next[catalogT.key]
        return next
      })
    }
  }

  const toggleIndividualPick = (testKey, paramKey, checked) => {
    setIndividualPicks((prev) => {
      const current = new Set(prev[testKey] || [])
      if (checked) current.add(paramKey)
      else current.delete(paramKey)
      return { ...prev, [testKey]: current }
    })
  }

  const handleAddIndividualParams = (catalogT) => {
    const picks = individualPicks[catalogT.key]
    if (!picks || picks.size === 0) return
    addParamsToTest(catalogT, [...picks])
    setIndividualPicks((prev) => ({ ...prev, [catalogT.key]: new Set() }))
  }

  const [showQualitativeUnitRange, setShowQualitativeUnitRange] = useState(patient?.showQualitativeUnitRange ?? false)

  const [editingRangeKey, setEditingRangeKey] = useState(null)
  const [rangeDraft, setRangeDraft] = useState('')

  const startEditRange = (testId, paramKey, currentRange) => {
    setEditingRangeKey(`${testId}::${paramKey}`)
    setRangeDraft(currentRange || '')
  }
  const cancelEditRange = () => {
    setEditingRangeKey(null)
    setRangeDraft('')
  }
  const saveEditRange = (testId, paramKey) => {
    setTests((prev) => prev.map((test) => test.id !== testId ? test : {
      ...test,
      params: test.params.map((param) => param.key === paramKey ? { ...param, range: rangeDraft } : param),
    }))
    setEditingRangeKey(null)
    setRangeDraft('')
  }

  const initialValues = useMemo(() => {
    if (!patient) return {}
    const vals = {}
    patient.tests.forEach((test) => {
      const existing = patient.results?.[test.id]
      vals[test.id] = { params: {}, paramDates: existing?.paramDates || {}, paramInduration: existing?.paramInduration || {} }
      test.params.forEach((param) => {
        vals[test.id].params[param.key] = existing?.params?.[param.key] ?? ''
        if (!vals[test.id].paramDates[param.key]) {
          vals[test.id].paramDates[param.key] = {
            testingDate: existing?.paramDates?.[param.key]?.testingDate || '',
            readingDate: existing?.paramDates?.[param.key]?.readingDate || '',
          }
        }
        if (vals[test.id].paramInduration[param.key] === undefined) {
          vals[test.id].paramInduration[param.key] = existing?.paramInduration?.[param.key] || ''
        }
      })
    })
    return vals
  }, [patient])

  const [values, setValues] = useState(initialValues)
  const [remarks, setRemarks] = useState(patient?.remarks || '')

  if (!patient) return <Navigate to="/dashboard" replace />

  const setParamValue = (testId, paramKey, val) => {
    setValues((prev) => {
      const catalogTest = findTest(testId)
      const updatedParams = { ...(prev[testId]?.params || {}), [paramKey]: val }
      const finalParams = catalogTest ? computeCalculated(catalogTest, updatedParams) : updatedParams
      return { ...prev, [testId]: { ...(prev[testId] || {}), params: finalParams } }
    })
  }

  const setParamDate = (testId, paramKey, field, val) => {
    setValues((prev) => {
      const currentParamDates = prev[testId]?.paramDates || {}
      const currentSingleParam = currentParamDates[paramKey] || { testingDate: '', readingDate: '' }
      return { ...prev, [testId]: { ...(prev[testId] || {}), paramDates: { ...currentParamDates, [paramKey]: { ...currentSingleParam, [field]: val } } } }
    })
  }

  const setParamInduration = (testId, paramKey, val) => {
    setValues((prev) => {
      const currentInduration = prev[testId]?.paramInduration || {}
      return { ...prev, [testId]: { ...(prev[testId] || {}), paramInduration: { ...currentInduration, [paramKey]: val } } }
    })
  }

  const handleRemoveTest = (testId, testLabel) => {
    if (!window.confirm(`Remove "${testLabel}" from this patient's tests?`)) return
    const updatedTests = tests.filter((test) => test.id !== testId)
    setTests(updatedTests)
    setValues((prev) => {
      const next = { ...prev }
      delete next[testId]
      return next
    })
  }

  const handleRemoveParam = (testId, paramKey, paramName) => {
    if (!window.confirm(`Remove parameter "${paramName}"?`)) return
    let removedWholeTest = false
    const updatedTests = tests.map((test) => {
      if (test.id !== testId) return test
      const updatedParams = test.params.filter((param) => param.key !== paramKey)
      if (updatedParams.length === 0) removedWholeTest = true
      return { ...test, params: updatedParams }
    }).filter((test) => test.params.length > 0)

    setTests(updatedTests)
    setValues((prev) => {
      const next = { ...prev }
      if (removedWholeTest) {
        delete next[testId]
      } else if (next[testId]) {
        const newParams = { ...next[testId].params }
        delete newParams[paramKey]
        const newParamDates = { ...next[testId].paramDates }
        delete newParamDates[paramKey]
        const newParamInduration = { ...next[testId].paramInduration }
        delete newParamInduration[paramKey]
        next[testId] = { ...next[testId], params: newParams, paramDates: newParamDates, paramInduration: newParamInduration }
      }
      return next
    })
  }

  // ==================================================================
  // FIX: previously this called `updatePatient(...)` and then
  // `saveResults(...)` separately. Each of those fires its own
  // fire-and-forget Firestore write internally, and since neither
  // write is awaited end-to-end, they could land on Firestore in
  // either order. If the `updatePatient` write (which didn't include
  // the freshly entered `results`) landed AFTER the `saveResults`
  // write, it would overwrite/erase the just-saved result values in
  // Firestore — even though everything looked fine in the local UI.
  //
  // Now we make ONE call (`saveTestResults`) that updates `tests` and
  // `results` together in a single state update / single Firestore
  // write, so there is no ordering race and result values are saved
  // reliably every time.
  //
  // FIX 2: the payload is now passed through sanitizeForFirestore()
  // right before the write, so ANY stray `undefined` value anywhere in
  // tests/results/remarks (not just the ones addParamsToTest already
  // guards) gets converted to `null` instead of crashing setDoc() with
  // "Unsupported field value: undefined".
  // ==================================================================
  const handleSave = async (e, generateReport = false) => {
    if (e) e.preventDefault()
    const processedTests = tests.map((test) => {
      const isIndividual = !test.full
      const isSingleTest = isIndividual && test.params.length === 1
      return { ...test, isSingleTest, isIndividual }
    })

    try {
      saveTestResults(
        patient.id,
        sanitizeForFirestore({
          tests: processedTests,
          results: values,
          remarks,
          showQualitativeUnitRange,
        })
      )
      if (generateReport) {
        navigate(`/patients/${patient.id}/report`)
      } else {
        window.alert('Test results saved successfully.')
      }
    } catch (error) {
      console.error('Error saving test results:', error)
      window.alert('Failed to save test results. Please try again.')
    }
  }

  return (
    <div className="page lab-premium lab-premium-v2">
      <style>{PREMIUM_CSS}</style>
      <Header />

      <FontScaleControl
        fontScale={fontScale}
        onIncrease={increaseFontScale}
        onDecrease={decreaseFontScale}
        onReset={resetFontScale}
      />

      <main className="content" style={{ zoom: fontScale, background: PG.cream, padding: '24px', borderRadius: '20px' }}>
        <PremiumHero
          eyebrow="Lab Report"
          title="Fill Test Results"
          subtitle={`${patient.name} • ${patient.age} yrs / ${patient.gender}`}
          action={
            <Link
              to="/dashboard"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.35)',
                color: '#fff', padding: '10px 18px', borderRadius: '999px', fontWeight: 600,
                fontSize: '0.88rem', textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              ← Back to Dashboard
            </Link>
          }
        />

        {/* ============== SEARCH & ADD MORE TESTS ============== */}
        <div
          className="panel pg-panel"
          style={{
            marginBottom: '24px', padding: '20px 22px',
            borderLeft: `5px solid ${PG.gold}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{
              width: '32px', height: '32px', borderRadius: '9px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', background: PG.goldSoft, fontSize: '0.95rem',
            }}>🔍</span>
            <label style={{ fontWeight: '700', color: PG.deep, fontSize: '1rem' }}>
              Search &amp; Add More Tests
            </label>
          </div>

          <input
            type="text"
            value={testSearch}
            onChange={(e) => setTestSearch(e.target.value)}
            placeholder="Search parent test or child parameter (e.g. CBC, Hemoglobin, LDL, HDL, HIV)..."
            style={{
              width: '100%', padding: '11px 14px', border: '1px solid var(--line)',
              borderRadius: '10px', fontSize: '0.95rem',
              marginBottom: testSearch.trim() ? '12px' : 0,
            }}
          />

          {testSearch.trim() && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px',
              overflowY: 'auto', overflowX: 'hidden', border: '1px solid var(--line)',
              borderRadius: '8px', padding: '8px', backgroundColor: 'var(--panel-soft)',
            }}>
              {filteredCatalogTests.length === 0 && (
                <span className="muted" style={{ fontSize: '0.85rem', padding: '6px 8px' }}>
                  No matching tests or parameters found.
                </span>
              )}

              {filteredCatalogTests.map((ct) => {
                const addedKeys = getAddedParamKeysForTest(ct.key)
                const isFullyAdded = addedKeys.size > 0 && addedKeys.size === ct.params.length
                const isExpanded = expandedTestKey === ct.key
                const picks = individualPicks[ct.key] || new Set()
                const matchingChildren = getSearchMatchingChildren(ct)

                return (
                  <div key={ct.key} style={{
                    border: `1px solid ${isExpanded ? PG.goldLine : 'var(--line)'}`,
                    borderRadius: '8px', backgroundColor: 'var(--panel)',
                    boxShadow: isExpanded ? '0 4px 14px rgba(217,154,43,0.18)' : 'none',
                    position: 'relative', zIndex: isExpanded ? 2 : 1,
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
                      borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                      backgroundColor: isFullyAdded ? PG.goldSoft : 'transparent',
                    }}>
                      <input
                        type="checkbox" checked={isFullyAdded}
                        onChange={(e) => handleToggleTest(ct, e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: PG.gold, flexShrink: 0 }}
                      />

                      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <label style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: isFullyAdded ? '700' : '500', cursor: 'pointer' }}>
                            {ct.label}
                          </label>
                          {addedKeys.size > 0 && !isFullyAdded && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: '600' }}>
                              ({addedKeys.size}/{ct.params.length} added)
                            </span>
                          )}
                        </div>

                        {matchingChildren.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--ink-soft)', fontWeight: '600' }}>Matching:</span>
                            {matchingChildren.slice(0, 8).map((param) => (
                              <span key={param.key} style={{
                                fontSize: '0.68rem', color: '#8a5a12', backgroundColor: PG.goldSoft,
                                borderRadius: '4px', padding: '2px 6px', whiteSpace: 'nowrap',
                              }}>↳ {param.name}</span>
                            ))}
                            {matchingChildren.length > 8 && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--ink-soft)', padding: '2px 4px' }}>
                                +{matchingChildren.length - 8} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="muted" style={{ fontSize: '0.72rem', marginLeft: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {ct.catHead}
                      </span>

                      {ct.params.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setExpandedTestKey(isExpanded ? null : ct.key)}
                          aria-expanded={isExpanded}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: '600',
                            color: isExpanded ? '#fff' : '#8a5a12',
                            background: isExpanded ? PG.gold : PG.goldSoft,
                            border: `1px solid ${isExpanded ? PG.gold : PG.goldLine}`,
                            borderRadius: '999px', padding: '5px 12px', cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          Individual
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{
                            transition: 'transform 0.15s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}>
                            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '14px 16px 16px 38px', borderTop: '1px solid var(--line)', backgroundColor: 'var(--panel-soft)', borderRadius: '0 0 8px 8px' }}>
                        {ct.params.map((param) => {
                          const already = addedKeys.has(param.key)
                          const checked = already || picks.has(param.key)
                          return (
                            <label key={param.key} style={{
                              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0',
                              opacity: already ? 0.6 : 1, cursor: already ? 'default' : 'pointer',
                            }}>
                              <input
                                type="checkbox" checked={checked} disabled={already}
                                onChange={(e) => toggleIndividualPick(ct.key, param.key, e.target.checked)}
                                style={{ width: '14px', height: '14px', cursor: already ? 'default' : 'pointer', accentColor: PG.gold }}
                              />
                              <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>
                                {param.name}{already ? ' (already added)' : ''}
                              </span>
                            </label>
                          )
                        })}

                        <button
                          type="button"
                          onClick={() => handleAddIndividualParams(ct)}
                          disabled={picks.size === 0}
                          className={picks.size === 0 ? '' : 'pg-btn-gold'}
                          style={{
                            marginTop: '10px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: '600',
                            borderRadius: '6px', border: 'none',
                            backgroundColor: picks.size === 0 ? 'var(--line)' : PG.gold,
                            color: '#fff', cursor: picks.size === 0 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          + Add Selected Parameters
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ============== RESULTS FORM ============== */}
        <form className="panel form-panel pg-panel" style={{ padding: '22px' }} onSubmit={(e) => handleSave(e, false)}>
          {tests.map((test, idx) => {
            const catalogTest = findTest(test.id)
            const isIndividual = !test.full
            const accent = getAccent(idx)

            return (
              <div
                key={test.id}
                className="result-test-block pg-test-card"
                style={{
                  marginBottom: '35px', border: '1px solid var(--line)', borderLeft: `5px solid ${accent.border}`,
                  borderRadius: '10px', padding: '22px', backgroundColor: 'var(--panel)',
                }}
              >
                <div className="section-title-row" style={{ borderBottom: '2px solid var(--line-soft)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '32px', height: '32px', borderRadius: '9px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', background: accent.bg,
                      color: accent.text, fontWeight: 800, fontSize: '0.95rem', flexShrink: 0,
                    }}>
                      {initialOf(test.label)}
                    </span>
                    <span>{test.label}</span>
                    {isIndividual && (
                      <span className="partial-badge" style={{
                        backgroundColor: 'var(--warning-soft)', color: 'var(--warning)', fontSize: '0.72rem',
                        padding: '3px 10px', borderRadius: '999px', fontWeight: '700', letterSpacing: '0.02em',
                      }}>
                        Individual Parameter Mode
                      </span>
                    )}
                  </h3>

                  <button
                    type="button" className="link-btn danger remove-test-btn"
                    onClick={() => handleRemoveTest(test.id, test.label)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    ✕ Remove whole test
                  </button>
                </div>

                <table className="result-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}>
                      <th style={{ padding: '12px 10px' }}>Parameter Name</th>
                      <th style={{ padding: '10px 8px', width: '220px' }}>Result / Observation</th>
                      <th style={{ padding: '10px 8px', width: '100px' }}>Unit</th>
                      <th style={{ padding: '10px 8px' }}>Normal Reference Range</th>
                      {isIndividual && <th className="col-remove" style={{ width: '40px' }} />}
                    </tr>
                  </thead>

                  <tbody>
                    {test.params.map((param) => {
                      const paramDef = catalogTest?.params.find((catalogParam) => catalogParam.key === param.key)
                      const isCalc = !!paramDef?.calc
                      const qualitative = isQualitativeRange(param.range)
                      const listId = `dl-${test.id}-${param.key}`
                      const isSelect = paramDef?.type === 'select'
                      const showSerology = !!param.isSerology
                      const showInduration = !!param.hasInduration || !!paramDef?.hasInduration

                      return (
                        <React.Fragment key={param.key}>
                          <tr style={{ borderBottom: showSerology || showInduration ? 'none' : '1px solid var(--line-soft)' }}>
                            <td style={{ padding: '14px 8px', verticalAlign: 'middle' }}>
                              <strong style={{ color: 'var(--ink)' }}>{param.name}</strong>
                              {isCalc && (
                                <span className="auto-badge" style={{
                                  marginLeft: '6px', backgroundColor: PG.goldSoft, color: '#8a5a12',
                                  fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '999px',
                                }}>
                                  Calculated
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '14px 8px' }}>
                              {isCalc ? (
                                <input
                                  className="result-input result-input-auto"
                                  value={values[test.id]?.params[param.key] || '—'}
                                  disabled readOnly
                                  style={{ backgroundColor: 'var(--panel-soft)', fontWeight: '600', width: '100%', padding: '6px 8px', borderRadius: '6px' }}
                                />
                              ) : param.key === 'bg' ? (
                                <BloodGroupSelect
                                  value={values[test.id]?.params[param.key] ?? ''}
                                  onChange={(selectedValue) => setParamValue(test.id, param.key, selectedValue)}
                                />
                              ) : isSelect ? (
                                <select
                                  className="result-input"
                                  value={values[test.id]?.params[param.key] ?? ''}
                                  onChange={(e) => setParamValue(test.id, param.key, e.target.value)}
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px' }}
                                >
                                  <option value="">Select</option>
                                  {paramDef?.options?.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              ) : (
                                <div style={{ position: 'relative' }}>
                                  <input
                                    className="result-input"
                                    value={values[test.id]?.params[param.key] ?? ''}
                                    onChange={(e) => setParamValue(test.id, param.key, e.target.value)}
                                    placeholder="Enter value"
                                    list={qualitative ? listId : undefined}
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px' }}
                                  />
                                  {qualitative && (
                                    <datalist id={listId}>
                                      {QUALITATIVE_SUGGESTIONS.map((suggestion) => (
                                        <option key={suggestion} value={suggestion} />
                                      ))}
                                    </datalist>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="muted" style={{ padding: '14px 8px', color: 'var(--ink-soft)', verticalAlign: 'middle' }}>
                              {param.unit || '—'}
                            </td>

                            <td style={{ padding: '14px 8px', color: 'var(--ink-soft)', verticalAlign: 'middle' }}>
                              {editingRangeKey === `${test.id}::${param.key}` ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="text" value={rangeDraft} onChange={(e) => setRangeDraft(e.target.value)}
                                    autoFocus placeholder="e.g. 70 - 140"
                                    style={{ width: '100%', padding: '4px 6px', border: `1px solid ${PG.goldLine}`, borderRadius: '4px', fontSize: '0.85rem', color: 'var(--ink)' }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEditRange(test.id, param.key)
                                      if (e.key === 'Escape') cancelEditRange()
                                    }}
                                  />
                                  <button type="button" onClick={() => saveEditRange(test.id, param.key)} title="Save range"
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: PG.deep, fontSize: '1rem', padding: '2px' }}>✓</button>
                                  <button type="button" onClick={cancelEditRange} title="Cancel"
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)', fontSize: '1rem', padding: '2px' }}>✕</button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="muted">{param.range || '—'}</span>
                                  <button type="button" onClick={() => startEditRange(test.id, param.key, param.range)} title="Edit reference range"
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: '0.8rem', padding: '2px' }}>✎</button>
                                </div>
                              )}
                            </td>

                            {isIndividual && (
                              <td className="col-remove" style={{ padding: '14px 8px', verticalAlign: 'middle' }}>
                                <button type="button" className="param-remove-btn" onClick={() => handleRemoveParam(test.id, param.key, param.name)}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)', fontSize: '1.1rem' }}>✕</button>
                              </td>
                            )}
                          </tr>

                          {(showSerology || showInduration) && (
                            <tr key={`${param.key}-extra`} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                              <td colSpan={isIndividual ? 5 : 4} style={{ padding: '0px 8px 14px 8px' }}>
                                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                  <div style={{
                                    width: '20px', borderLeft: `2px dashed ${PG.goldLine}`, borderBottom: `2px dashed ${PG.goldLine}`,
                                    marginLeft: '10px', marginRight: '10px', marginBottom: '22px', borderBottomLeftRadius: '6px',
                                  }} />
                                  <div style={{
                                    flex: 1, backgroundColor: PG.goldSoft, border: `1px solid ${PG.goldLine}`, borderRadius: '8px',
                                    padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#8a5a12', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        🧪 {showInduration ? 'Test Setup' : 'Serology Duration Setup'}
                                      </span>
                                      <span style={{ fontSize: '0.75rem', color: '#8a5a12', backgroundColor: PG.goldSoft, padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>
                                        for {param.name}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                      {showSerology && (
                                        <>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Testing Date:</span>
                                            <input type="date"
                                              style={{ width: '100%', padding: '6px 8px', border: `1px solid ${PG.goldLine}`, borderRadius: '6px', fontSize: '0.85rem', backgroundColor: 'var(--panel)', color: 'var(--ink)' }}
                                              value={values[test.id]?.paramDates?.[param.key]?.testingDate || ''}
                                              onChange={(e) => setParamDate(test.id, param.key, 'testingDate', e.target.value)}
                                            />
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Reading Date:</span>
                                            <input type="date"
                                              style={{ width: '100%', padding: '6px 8px', border: `1px solid ${PG.goldLine}`, borderRadius: '6px', fontSize: '0.85rem', backgroundColor: 'var(--panel)', color: 'var(--ink)' }}
                                              value={values[test.id]?.paramDates?.[param.key]?.readingDate || ''}
                                              onChange={(e) => setParamDate(test.id, param.key, 'readingDate', e.target.value)}
                                            />
                                          </div>
                                        </>
                                      )}

                                      {showInduration && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
                                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--ink-soft)' }}>Induration (mm):</span>
                                          <input type="number" min="0" step="1" placeholder="e.g. 12"
                                            style={{ width: '100%', padding: '6px 8px', border: `1px solid ${PG.goldLine}`, borderRadius: '6px', fontSize: '0.85rem', backgroundColor: 'var(--panel)', color: 'var(--ink)' }}
                                            value={values[test.id]?.paramInduration?.[param.key] || ''}
                                            onChange={(e) => setParamInduration(test.id, param.key, e.target.value)}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}

          <div className="field full">
            <label style={{ fontWeight: '600', color: PG.deep }}>General Remarks / Comments (optional)</label>
            <textarea
              rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
              placeholder="Write any overall notes for this patient's report..."
              style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '10px', width: '100%' }}
            />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: PG.goldSoft,
            border: `1px solid ${PG.goldLine}`, borderRadius: '10px', padding: '12px 16px', marginTop: '20px', marginBottom: '20px',
          }}>
            <input
              type="checkbox" id="toggle-unit-range" checked={showQualitativeUnitRange}
              onChange={(e) => setShowQualitativeUnitRange(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: PG.gold }}
            />
            <label htmlFor="toggle-unit-range" style={{ fontSize: '0.92rem', fontWeight: '600', color: PG.deep, cursor: 'pointer', userSelect: 'none' }}>
              Show Unit &amp; Normal Reference Range for Qualitative/HIV Results
            </label>
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
            <button
              type="submit" className="pg-btn-outline-deep" disabled={tests.length === 0}
              style={{ padding: '10px 24px', fontSize: '1rem', fontWeight: '700', minWidth: '110px', borderRadius: '999px', cursor: tests.length === 0 ? 'not-allowed' : 'pointer', opacity: tests.length === 0 ? 0.5 : 1 }}
            >
              💾 Save
            </button>

            <button
              type="button" className="pg-btn-gold" disabled={tests.length === 0} onClick={(e) => handleSave(e, true)}
              style={{ padding: '10px 24px', fontSize: '1rem', fontWeight: '700', borderRadius: '999px', cursor: tests.length === 0 ? 'not-allowed' : 'pointer', opacity: tests.length === 0 ? 0.5 : 1 }}
            >
              Save &amp; Generate Report →
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}