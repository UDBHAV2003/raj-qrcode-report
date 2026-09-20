import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
// PatientContext.jsx lives in src/context/, Firebase.js lives in
// src/components/ — hence '../components/Firebase'.
import { db } from '../components/Firebase'

// Bump this whenever the shape of a stored patient record changes
// (e.g. `tests` went from a plain array of IDs to an array of line-item
// objects with `.params`). Old data in a browser's localStorage that
// doesn't match the current shape would otherwise crash pages that
// assume the new shape (e.g. reading `t.params.length`) — so instead we
// detect the mismatch and start fresh rather than crash.
const SCHEMA_VERSION = '3'
const STORAGE_KEY = 'spdc_patients'
const VERSION_KEY = 'spdc_patients_schema_version'
const PATIENTS_COLLECTION = 'patients'
const PatientContext = createContext(null)

function isValidPatientShape(p) {
  return (
    p &&
    typeof p === 'object' &&
    Array.isArray(p.tests) &&
    p.tests.every((t) => t && Array.isArray(t.params))
  )
}

function loadPatients() {
  try {
    if (localStorage.getItem(VERSION_KEY) !== SCHEMA_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem(VERSION_KEY, SCHEMA_VERSION)
      return []
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isValidPatientShape)) {
      // Data is present but doesn't match the shape this build expects —
      // rather than risk a crash, drop it and start clean.
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
    return parsed
  } catch {
    return []
  }
}

// Pushes a patient record to Firestore so /report/:id can load it from
// any device. Best-effort: if it fails (offline, bad config, etc.) we
// log it but don't block the local (staff-side) workflow — localStorage
// still works as before regardless of Firestore's state.
async function syncToFirestore(patient) {
  try {
    await setDoc(doc(db, PATIENTS_COLLECTION, patient.id), patient, { merge: true })
  } catch (err) {
    console.error('Firestore sync failed (patient still saved locally):', err)
  }
}

async function removeFromFirestore(id) {
  try {
    await deleteDoc(doc(db, PATIENTS_COLLECTION, id))
  } catch (err) {
    console.error('Firestore delete failed:', err)
  }
}

export function PatientProvider({ children }) {
  const [patients, setPatients] = useState(loadPatients)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients))
  }, [patients])

  const addPatient = useCallback((patient) => {
    const id = `P${Date.now()}`
    const newPatient = {
      id,
      ...patient,
      // The report header's "Sample Collected At:" line reads
      // `collectionAddress`. Normalize it here so every patient record
      // has the field under one canonical name, regardless of whether
      // the intake form passed it as `collectionAddress` or the older
      // `address` key.
      collectionAddress: patient.collectionAddress || patient.address || '',
      results: {},
      status: 'pending', // pending | completed
      createdAt: new Date().toISOString(),
    }
    setPatients((prev) => [newPatient, ...prev])
    syncToFirestore(newPatient)
    return id
  }, [])

  const getPatient = useCallback(
    (id) => patients.find((p) => p.id === id),
    [patients]
  )

  const saveResults = useCallback((id, results, remarks = '') => {
    let updated = null
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        updated = { ...p, results, remarks, status: 'completed' }
        return updated
      })
    )
    // Fire the Firestore sync once we have the updated record. This is
    // the point where the QR code becomes "live" — before results are
    // saved there's nothing worth showing on the phone anyway.
    if (updated) syncToFirestore(updated)
  }, [])

  // ==================================================================
  // saveTestResults — used by TestResults.jsx's handleSave.
  //
  // Combines what used to be two separate calls (`updatePatient` for
  // `tests`, then `saveResults` for `results`) into ONE state update /
  // ONE Firestore write. Each of those separate calls fired its own
  // fire-and-forget Firestore write, and since neither was awaited
  // end-to-end, they could land on Firestore out of order — if the
  // `updatePatient` write (missing the fresh `results`) landed AFTER
  // the `saveResults` write, it would silently overwrite/erase the
  // just-saved results in Firestore even though the local UI looked
  // fine. Updating everything together removes that race.
  //
  // `updates` is expected to look like:
  //   { tests, results, remarks, showQualitativeUnitRange }
  // ==================================================================
  const saveTestResults = useCallback((id, updates) => {
    let updated = null
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        updated = { ...p, ...updates, status: 'completed' }
        return updated
      })
    )
    if (updated) syncToFirestore(updated)
  }, [])

  // Generic patient-record patch — used by the Dashboard's Quick Edit box
  // to update fields like `name`, `referredBy` (doctor name), and
  // `status` without touching results/tests. Only the keys passed in
  // `updates` are overwritten; everything else on the record is kept.
  const updatePatient = useCallback((id, updates) => {
    let updated = null
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        updated = { ...p, ...updates }
        return updated
      })
    )
    if (updated) syncToFirestore(updated)
  }, [])

  const deletePatient = useCallback((id) => {
    setPatients((prev) => prev.filter((p) => p.id !== id))
    removeFromFirestore(id)
  }, [])

  return (
    <PatientContext.Provider
      value={{
        patients,
        addPatient,
        getPatient,
        saveResults,
        saveTestResults,
        updatePatient,
        deletePatient,
      }}
    >
      {children}
    </PatientContext.Provider>
  )
}

export function usePatients() {
  return useContext(PatientContext)
}