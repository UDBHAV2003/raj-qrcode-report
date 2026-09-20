import { useState, useMemo, useEffect } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { usePDF } from '@react-pdf/renderer'
import Header from '../components/Header'
import { usePatients } from '../context/PatientContext'
import ReportDocument, {
  prepareReportCodes,
} from '../components/ReportDocument'

const FONT_OPTIONS = [
  {
    id: 'times',
    label: 'Times (Serif)',
    regular: 'Times-Roman',
    bold: 'Times-Bold',
  },
]

// Lets you bump the RESULT column (and unit/range) text size up or down
// without changing the rest of the report.
const SIZE_OPTIONS = [
  {
    id: 'large',
    label: 'Large',
    scale: 1.18,
  },
]

export default function Report() {
  const { id } = useParams()
  const { patients = [], getPatient } = usePatients()

  // ------------------------------------------------------------
  // Get the latest patient object from context
  // ------------------------------------------------------------
  const patient = useMemo(() => {
    if (typeof getPatient === 'function') {
      const p = getPatient(id)
      if (p) return p
    }

    return patients.find(
      (p) => String(p.id) === String(id)
    )
  }, [patients, getPatient, id])

  // ------------------------------------------------------------
  // Font / result-size controls
  // ------------------------------------------------------------
  const [fontId, setFontId] = useState(FONT_OPTIONS[0].id)
  const [sizeId, setSizeId] = useState(SIZE_OPTIONS[0].id)

  const font =
    FONT_OPTIONS.find((f) => f.id === fontId) ||
    FONT_OPTIONS[0]

  const size =
    SIZE_OPTIONS.find((s) => s.id === sizeId) ||
    SIZE_OPTIONS[0]

  // ------------------------------------------------------------
  // Letterhead toggle
  // ------------------------------------------------------------
  // withoutLetterhead = true  -> blank top/bottom margin, for printing on
  //   the clinic's pre-printed letterhead paper (this was the only
  //   behaviour before, so it stays the default).
  // withoutLetterhead = false -> the PDF draws its own premium letterhead
  //   (banner, accent bar, decorative frame, "Digitally Verified" badge)
  //   directly onto the page — the same look someone gets when they scan
  //   the QR code on the report, so you can preview/download it here too.
  const [withoutLetterhead, setWithoutLetterhead] = useState(true)
  const withLetterhead = !withoutLetterhead

  // ------------------------------------------------------------
  // IMPORTANT:
  // ReportDocument needs QR + barcode image data BEFORE
  // react-pdf renders the document.
  // ------------------------------------------------------------
  const [preparedPatient, setPreparedPatient] = useState(null)
  const [codesLoading, setCodesLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function prepareCodes() {
      if (!patient) {
        setPreparedPatient(null)
        return
      }

      setCodesLoading(true)

      try {
        /*
         * QR CODE TARGET
         *
         * Example:
         * https://yourdomain.com/report/P1789655501377?letterhead=1
         *
         * window.location.origin automatically uses the current deployed
         * website domain. prepareReportCodes() appends `?letterhead=1`
         * itself, so whoever scans this QR code always lands on the
         * premium drawn-letterhead version of the report — even if the
         * "Without Letterhead" checkbox below is ticked for the local
         * preview/print copy. Your public "/report/:id" route should
         * read that query param and render
         * <ReportDocument withLetterhead /> accordingly.
         */
        const reportUrl =
          patient.reportUrl ||
          `${window.location.origin}/report/${patient.id}`

        const patientWithCodes = await prepareReportCodes(
          patient,
          {
            reportUrl,
          }
        )

        if (!cancelled) {
          setPreparedPatient(patientWithCodes)
        }
      } catch (error) {
        console.error(
          'QR / Barcode generation failed:',
          error
        )

        // Keep the report usable even if code generation fails.
        if (!cancelled) {
          setPreparedPatient(patient)
        }
      } finally {
        if (!cancelled) {
          setCodesLoading(false)
        }
      }
    }

    prepareCodes()

    return () => {
      cancelled = true
    }
  }, [
    patient,
    patient?.id,
    patient?.reportDate,
    patient?.sampleDate,
    patient?.status,
  ])

  // ------------------------------------------------------------
  // Create PDF document
  // ------------------------------------------------------------
  const doc = useMemo(() => {
    if (!preparedPatient) return null

    return (
      <ReportDocument
        patient={preparedPatient}
        fontRegular={font.regular}
        fontBold={font.bold}
        resultScale={size.scale}
        withLetterhead={withLetterhead}
      />
    )
  }, [
    preparedPatient,
    font.regular,
    font.bold,
    size.scale,
    withLetterhead,
  ])

  // ------------------------------------------------------------
  // SINGLE render pipeline.
  //
  // Previously this page rendered the SAME `doc` through THREE separate
  // react-pdf pipelines at once — usePDF(), <PDFViewer>, and
  // <PDFDownloadLink> — each of which does its own full, synchronous
  // page-layout pass. react-pdf's layout engine blocks the main thread
  // while it runs, so toggling the letterhead checkbox (which rebuilds
  // `doc`, now heavier thanks to the letterhead's extra grid card + FLAG
  // column) fired that expensive work three times simultaneously —
  // which is what looked like the page "hanging".
  //
  // Now there's only ONE render (via usePDF). The preview below is a
  // plain <iframe src={instance.url}>, and download/print both reuse the
  // same instance.url — no duplicate rendering.
  // ------------------------------------------------------------
  const [instance, updatePDFInstance] = usePDF({
    document: doc,
  })

  useEffect(() => {
    if (
      doc &&
      typeof updatePDFInstance === 'function'
    ) {
      updatePDFInstance(doc)
    }
  }, [doc, updatePDFInstance])

  // ------------------------------------------------------------
  // Print
  // ------------------------------------------------------------
  const handlePrint = () => {
    if (!instance.url) return

    const win = window.open(
      instance.url,
      '_blank'
    )

    if (win) {
      win.addEventListener('load', () => {
        win.print()
      })
    }
  }

  // ------------------------------------------------------------
  // Ctrl + P
  // ------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'p'
      ) {
        e.preventDefault()
        handlePrint()
      }
    }

    document.addEventListener(
      'keydown',
      onKeyDown
    )

    return () => {
      document.removeEventListener(
        'keydown',
        onKeyDown
      )
    }
  }, [instance.url])

  // ------------------------------------------------------------
  // Patient not found
  // ------------------------------------------------------------
  if (!patient) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    )
  }

  const fileName = `${
    patient.name?.replace(/\s+/g, '_') ||
    'Patient'
  }_Report${withLetterhead ? '_Letterhead' : ''}.pdf`

  // ------------------------------------------------------------
  // QR / barcode preparation screen
  // ------------------------------------------------------------
  if (!preparedPatient || codesLoading) {
    return (
      <div className="page">
        <Header />

        <main className="content">
          <div className="page-title-row">
            <div>
              <h2>Diagnostic Report</h2>

              <p className="muted">
                {patient.name} • {patient.age} yrs /{' '}
                {patient.gender}
              </p>
            </div>

            <div className="header-actions-inline">
              <Link
                className="btn btn-outline"
                to={`/patients/${patient.id}/results`}
              >
                ← Edit Results
              </Link>

              <Link
                className="btn btn-outline"
                to="/dashboard"
              >
                Dashboard
              </Link>
            </div>
          </div>

          <div
            className="panel pdf-panel"
            style={{
              minHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 18 }}>
              Preparing Report...
            </div>

            <div className="muted">
              Generating QR code and barcode
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ------------------------------------------------------------
  // Main page
  // ------------------------------------------------------------
  return (
    <div className="page">
      <Header />

      <main className="content">

        {/* PAGE TITLE */}
        <div className="page-title-row">
          <div>
            <h2>Diagnostic Report</h2>

            <p className="muted">
              {patient.name} • {patient.age} yrs /{' '}
              {patient.gender}
            </p>
          </div>

          <div className="header-actions-inline">
            <Link
              className="btn btn-outline"
              to={`/patients/${patient.id}/results`}
            >
              ← Edit Results
            </Link>

            <Link
              className="btn btn-outline"
              to="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* REPORT TOOLBAR */}
        <div className="report-toolbar">

          <label className="font-select">
            <span>Report font</span>

            <select
              value={fontId}
              onChange={(e) =>
                setFontId(e.target.value)
              }
            >
              {FONT_OPTIONS.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                >
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="result-size-select">
            <span>Result text size</span>

            <select
              value={sizeId}
              onChange={(e) =>
                setSizeId(e.target.value)
              }
            >
              {SIZE_OPTIONS.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                >
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {/* Without Letterhead checkbox — checked (default) = blank
              top/bottom margin for printing on the clinic's pre-printed
              letterhead paper. Unchecked = preview/download the same
              premium drawn letterhead someone sees when they scan the
              report's QR code. */}
          <label
            className="letterhead-toggle"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.92rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={withoutLetterhead}
              onChange={(e) => setWithoutLetterhead(e.target.checked)}
            />
            <span>Without Letterhead</span>
          </label>

          <button
            className="btn btn-outline"
            onClick={handlePrint}
            disabled={!instance.url}
          >
            🖨 Print
          </button>

          {/* Download now reuses the SAME usePDF() instance instead of
              spinning up a second react-pdf render via PDFDownloadLink. */}
          <a
            href={instance.url || undefined}
            download={fileName}
            className="btn btn-primary"
            aria-disabled={instance.loading || !instance.url}
            onClick={(e) => {
              if (instance.loading || !instance.url) e.preventDefault()
            }}
            style={
              instance.loading || !instance.url
                ? { opacity: 0.6, pointerEvents: 'none' }
                : undefined
            }
          >
            {instance.loading ? 'Preparing PDF…' : 'Download PDF ⬇'}
          </a>

        </div>

        <p className="muted" style={{ marginTop: -6, marginBottom: 10, fontSize: '0.82rem' }}>
          {withoutLetterhead
            ? 'This copy has a blank header/footer for printing on your pre-printed letterhead paper. The QR code on it always opens the full letterhead version when scanned.'
            : 'Previewing the premium drawn letterhead — the same version someone sees when they scan the report\'s QR code.'}
        </p>

        {/* PDF PREVIEW — a plain iframe pointed at the SAME usePDF()
            blob URL, instead of a second full react-pdf render via
            <PDFViewer>. */}
        <div className="panel pdf-panel">
          {instance.loading || !instance.url ? (
            <div
              style={{
                minHeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Rendering PDF…
            </div>
          ) : (
            <iframe
              key={instance.url}
              src={instance.url}
              title="Report preview"
              width="100%"
              height="900"
              style={{ border: 'none' }}
            />
          )}
        </div>

      </main>
    </div>
  )
}