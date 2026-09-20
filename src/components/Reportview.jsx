import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { pdf } from '@react-pdf/renderer'
// This file lives in src/components/, same folder as Firebase.js and
// ReportDocument.jsx.
import { db } from './Firebase'
import ReportDocument, { prepareReportCodes } from './ReportDocument'

// This is the page the QR code on the printed report points to
// (REPORT_VIEW_BASE_URL / prepareReportCodes' reportUrl in
// ReportDocument.jsx). Register it in your router as:
//   <Route path="/report/:id" element={<ReportView />} />
export default function ReportView() {
  const { id } = useParams()
  const [patient, setPatient] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  // 'loading' | 'ready' | 'notfound' | 'error'
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const snap = await getDoc(doc(db, 'patients', id))
        if (!snap.exists()) {
          if (!cancelled) setStatus('notfound')
          return
        }

        const data = { id: snap.id, ...snap.data() }
        // Re-generate the QR/barcode images for THIS render (they're not
        // stored in Firestore — only the small data fields are).
        const withCodes = await prepareReportCodes(data, { reportUrl: window.location.href })
        if (cancelled) return
        setPatient(withCodes)

        // withLetterhead: true — this /report/:id route only ever runs when
        // someone scans the QR code on the printed report, so it always
        // renders the drawn-letterhead / digital version (grid patient card,
        // FLAG column, signature footer) — never the blank pre-printed one.
        const blob = await pdf(<ReportDocument patient={withCodes} withLetterhead />).toBlob()
        if (cancelled) return
        setPdfUrl(URL.createObjectURL(blob))
        setStatus('ready')
      } catch (err) {
        console.error('Report load failed:', err)
        if (!cancelled) setStatus('error')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (status === 'loading') return <Center>Loading report…</Center>
  if (status === 'notfound') return <Center>Report not found. Please check with the lab.</Center>
  if (status === 'error') return <Center>Could not load the report. Please try again.</Center>

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h2 style={styles.name}>{patient.name?.toUpperCase()}</h2>
        <p style={styles.meta}>Patient ID: {patient.id}</p>
        <p style={styles.meta}>
          Status: {patient.status === 'completed' ? 'Report Ready' : 'Pending'}
        </p>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={styles.btn}>
          View / Download Report
        </a>
      </div>
    </div>
  )
}

function Center({ children }) {
  return <div style={styles.center}>{children}</div>
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
    padding: 16,
    fontFamily: 'sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 24,
    maxWidth: 360,
    width: '100%',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  name: { fontSize: 18, marginBottom: 6 },
  meta: { fontSize: 13, color: '#555', marginBottom: 4 },
  btn: {
    display: 'inline-block',
    marginTop: 16,
    padding: '10px 20px',
    background: '#000',
    color: '#fff',
    borderRadius: 6,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 'bold',
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    padding: 16,
    textAlign: 'center',
  },
}