import React from 'react'
import { Document, Page, View, Text, StyleSheet, Image, pdf, Svg, Path, Line, Circle } from '@react-pdf/renderer'
import bwipjs from '@bwip-js/browser'
import { findTest } from '../data/tests'

// Premium Minimalist Brand Color Palette (Black Theme)
const PRIMARY_BLACK = '#0c0c0c'
const TEXT_DARK = '#000000'
const TEXT_MUTED = '#211f1fef'
const LINE_BORDER = '#9ca3af'
const ABNORMAL_BG = '#f0f0f0'

// Letterhead brand colors (matches the Raj Pathology Center HTML letterhead)
const LH_AMBER = '#ee9e35'
const LH_AMBER_DARK = '#c9781c'
const LH_NAVY = '#1f2a3c'
const LH_GRAY = '#5b6470'
const LH_GREEN = '#2f8f46'

// ---- Result-flag colors (used in the digital / QR-scanned report's
// FLAG column — High / Low / Normal indicators) --------------------
const FLAG_HIGH_COLOR = '#c0392b'
const FLAG_LOW_COLOR = '#1f5fa8'
const FLAG_NORMAL_COLOR = '#2f8f46'

// ---- Two margin presets ------------------------------------------------
// BLANK: used when printing on the clinic's pre-printed letterhead paper —
//   the top/bottom of the PDF stays empty because the physical paper
//   already has the letterhead printed on it.
// LETTERHEAD: used for the digital / QR-scanned version, where there is no
//   physical pre-printed paper, so the PDF draws its own letterhead header
//   and footer directly onto the page.
const MARGIN_TOP_BLANK = 153
const MARGIN_BOTTOM_BLANK = 83
const MARGIN_TOP_LETTERHEAD = 168
const MARGIN_BOTTOM_LETTERHEAD = 150

// Unified base size so everything in the table row stays perfectly balanced
const BASE_FONT_SIZE = 8.7

// Base URL used to build the "scan to view report online" QR code.
// Change this to your actual hosted report-viewer route.
const REPORT_VIEW_BASE_URL = 'https://demo-raj-barcode.vercel.app/report'

// Result values that are purely qualitative
const QUALITATIVE_VALUES = [
  'positive',
  'negative',
  'reactive',
  'non-reactive',
  'nonreactive',
  'borderline',
  'nil',
  'trace',
  'present',
  'absent',
]

function isQualitativeResult(val) {
  if (!val) return false
  const strVal = String(val).trim().toLowerCase()
  return QUALITATIVE_VALUES.some((q) => strVal.includes(q))
}

// ---- FLAG column helper (High / Low / Normal) -------------------------
// Reuses the existing evaluateFlag() output ('H' | 'L' | 'ABN' | null) and
// maps it to the label + color shown in the digital report's FLAG column.
function getFlagDisplay(flag) {
  if (flag === 'H') return { label: 'H', arrow: '\u2191', color: FLAG_HIGH_COLOR }
  if (flag === 'L') return { label: 'L', arrow: '\u2193', color: FLAG_LOW_COLOR }
  if (flag === 'ABN') return { label: 'ABN', arrow: '', color: FLAG_HIGH_COLOR }
  return { label: 'N', arrow: '', color: FLAG_NORMAL_COLOR }
}

// =====================================================================
// ---- QR Code + Barcode generation (bwip-js) -------------------------
// bwip-js renders pure-JS raster images (no native "canvas" build step
// required), so this works fine on servers, serverless functions, etc.
// Both helpers return a base64 PNG data URL that react-pdf's <Image />
// component can render directly.
// =====================================================================

/**
 * Generates a QR code data URL. Point it at a URL that opens this
 * report online, so scanning the QR code from the printed/PDF report
 * shows the report in a browser.
 */
export async function generateQrCodeDataUrl(text) {
  try {
    if (typeof document === 'undefined' || typeof bwipjs?.toCanvas !== 'function') {
      console.error('QR code generation is only available in the browser via @bwip-js/browser')
      return null
    }

    const canvas = document.createElement('canvas')

    bwipjs.toCanvas(canvas, {
      bcid: 'qrcode',
      text: String(text),
      scale: 4,
      includetext: false,
      backgroundcolor: 'FFFFFF',
      padding: 0,
    })

    return canvas.toDataURL('image/png')
  } catch (err) {
    console.error('QR code generation failed:', err)
    return null
  }
}

/**
 * Generates a Code128 barcode data URL for the Patient ID.
 */
export async function generateBarcodeDataUrl(text) {
  try {
    if (typeof document === 'undefined' || typeof bwipjs?.toCanvas !== 'function') {
      console.error('Barcode generation is only available in the browser via @bwip-js/browser')
      return null
    }

    const canvas = document.createElement('canvas')

    bwipjs.toCanvas(canvas, {
      bcid: 'code128',
      text: String(text || 'NA'),
      scale: 3,
      height: 10,
      includetext: false,
      backgroundcolor: 'FFFFFF',
      padding: 0,
    })

    return canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Barcode generation failed:', err)
    return null
  }
}

/**
 * Call this BEFORE rendering <ReportDocument /> — it attaches
 * `qrCodeDataUrl` and `barcodeDataUrl` to the patient object so the
 * component itself can stay a plain synchronous React component
 * (react-pdf renders synchronously, so image data must already be
 * resolved by the time you render).
 *
 * @param {object} patient - your existing patient object
 * @param {object} [options]
 * @param {string} [options.reportUrl] - full URL to embed in the QR code.
 *   Defaults to the current site's `/report/{patient.id}` route, with a
 *   `?letterhead=1` marker so that route knows to render the premium
 *   drawn-letterhead version for anyone scanning the code (there is no
 *   physical pre-printed paper on a phone screen).
 */
export async function prepareReportCodes(patient, options = {}) {
  // Priority: an explicit override > a URL already saved on the patient
  // record > the fixed REPORT_VIEW_BASE_URL below (once you've set it to
  // your real deployed domain) > window.location.origin as a last resort
  // (only useful if this app itself is being viewed at a public URL —
  // NEVER while running `npm run dev`, since that origin is localhost and
  // only reachable on this one computer).
  const isPlaceholderBaseUrl = REPORT_VIEW_BASE_URL.includes('yourdomain.com')

  let reportUrl =
    options.reportUrl ||
    patient.reportUrl ||
    (!isPlaceholderBaseUrl
      ? `${REPORT_VIEW_BASE_URL}/${patient.id}`
      : typeof window !== 'undefined'
      ? `${window.location.origin}/report/${patient.id}`
      : `${REPORT_VIEW_BASE_URL}/${patient.id}`)

  // Make sure whoever scans the QR code always lands on the drawn-letterhead
  // version, regardless of the `letterhead` param the caller may or may not
  // have already added — the public/online viewer route should read this
  // flag and render <ReportDocument withLetterhead /> accordingly.
  if (options.forceLetterheadParam !== false) {
    reportUrl += reportUrl.includes('?') ? '&letterhead=1' : '?letterhead=1'
  }

  const [qrCodeDataUrl, barcodeDataUrl] = await Promise.all([
    generateQrCodeDataUrl(reportUrl),
    generateBarcodeDataUrl(patient.id ?? ''),
  ])

  return {
    ...patient,
    qrCodeDataUrl,
    barcodeDataUrl,
  }
}

/**
 * Convenience end-to-end helper: prepares the codes and returns the
 * finished PDF as a Buffer, ready to save/send/upload.
 *
 *   const buffer = await generateReportPdfBuffer(patient)
 *   fs.writeFileSync('report.pdf', buffer)
 *
 * Pass { docProps: { withLetterhead: true } } to render the drawn
 * letterhead version (used for the QR-scan / online report).
 */
export async function generateReportPdfBuffer(patient, options = {}) {
  const patientWithCodes = await prepareReportCodes(patient, options)
  const instance = pdf(<ReportDocument patient={patientWithCodes} {...options.docProps} />)
  return instance.toBuffer()
}

// ---- Mantoux (Tuberculin Skin Test) interpretation helper -----------
function getMantouxInterpretation(resultVal) {
  const r = (resultVal || '').trim().toLowerCase()

  if (r.includes('strongly')) {
    return {
      interpretation: 'Strongly positive Mantoux test.',
      comment:
        'Marked delayed hypersensitivity reaction to tuberculin antigen. Clinical correlation and further evaluation for tuberculosis infection is advised.',
    }
  }
  if (r.includes('positive')) {
    return {
      interpretation: 'Positive Mantoux test.',
      comment:
        'Suggestive of delayed hypersensitivity to tuberculin antigen. Clinical correlation is advised.',
    }
  }
  if (r.includes('borderline')) {
    return {
      interpretation: 'Borderline Mantoux test.',
      comment:
        'Equivocal reaction to tuberculin antigen. Repeat testing or further clinical evaluation is advised.',
    }
  }
  if (r.includes('negative')) {
    return {
      interpretation: 'Negative Mantoux test.',
      comment:
        'No significant delayed hypersensitivity reaction to tuberculin antigen detected.',
    }
  }
  return { interpretation: '—', comment: '—' }
}

// ---- HbA1c Reference Table Helper Component --------------------------
function HbA1cReferenceTable({ styles }) {
  const tableData = [
    { range: '>8%', result: 'Action Suggested' },
    { range: '7-8%', result: 'Good Control' },
    { range: '<7%', result: 'Goal' },
    { range: '6-7%', result: 'Near Normal Glycemia' },
    { range: '<6%', result: 'Normal level' },
  ]

  return (
    <View style={styles.hba1cWrap} wrap={false}>
      <Text style={styles.hba1cTitle}>HbA1C Reference Range</Text>
      <View style={styles.hba1cTable}>
        <View style={styles.hba1cHeaderRow}>
          <Text style={styles.hba1cHeaderCol1}>HbA1C %</Text>
          <Text style={styles.hba1cHeaderCol2}>Result</Text>
        </View>
        {tableData.map((row, idx) => (
          <View
            key={idx}
            style={idx === tableData.length - 1 ? styles.hba1cRowLast : styles.hba1cRow}
          >
            <Text style={styles.hba1cCol1}>{row.range}</Text>
            <Text style={styles.hba1cCol2}>{row.result}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ---- Drawn letterhead HEADER (used only when withLetterhead=true) ----
// Redesigned to match the reference "HealthPlus Diagnostics"-style digital
// report: round logo badge on the left, clinic name + address + phone/email
// in the middle, and a solid navy "tagline" panel on the right (no doctor
// block here anymore — the doctor/pathologist now signs off in the footer,
// matching the reference layout). Rendered as a `fixed` element so it
// repeats identically on every page.
function LetterheadHeader({ styles }) {
  return (
    <View style={styles.lhHeaderWrap} fixed>
      <View style={styles.lhBanner}>
        <View style={styles.lhLogoCircle}>
          <Svg viewBox="0 0 40 40" style={styles.lhLogoSvg}>
            <Path
              d="M20 6 C 8 10 8 26 20 32 C 32 26 32 10 20 6 Z"
              fill="none"
              stroke={LH_NAVY}
              strokeWidth={2.5}
            />
            <Line x1={20} y1={32} x2={20} y2={12} stroke={LH_NAVY} strokeWidth={2} />
          </Svg>
        </View>

        <View style={styles.lhClinicBlock}>
          <Text style={styles.lhClinicName}>RAJ PATHOLOGY CENTER</Text>
          <Text style={styles.lhClinicAddress}>Katra Gulab Singh Bus Stop, Prayagraj, India</Text>
          <View style={styles.lhContactRow}>
            <Text style={styles.lhContactItem}>+91 9936031710</Text>
            <Text style={styles.lhContactDot}>•</Text>
            <Text style={styles.lhContactItem}>dr.sanjay.singh@rajpathology.in</Text>
          </View>
        </View>

        <View style={styles.lhTaglineBox}>
          <Svg viewBox="0 0 24 24" style={styles.lhTaglineIcon}>
            <Circle cx={12} cy={12} r={9} fill="none" stroke="#ffffff" strokeWidth={1.6} />
            <Line x1={12} y1={7} x2={12} y2={13} stroke="#ffffff" strokeWidth={1.6} />
            <Line x1={9} y1={16} x2={15} y2={16} stroke="#ffffff" strokeWidth={1.6} />
          </Svg>
          <Text style={styles.lhTaglineText}>Accurate Tests</Text>
          <Text style={styles.lhTaglineText}>Better Care</Text>
        </View>
      </View>
    </View>
  )
}

// ---- Section banner naming the current test (e.g. "CBC (COMPLETE BLOOD
// COUNT)"), drawn as a solid navy strip right under the header — mirrors
// the reference report's title banner. Falls back to a generic label when
// there's more than one test on the report. ----
function TestTitleBanner({ styles, patient }) {
  const tests = patient?.tests || []
  const label =
    tests.length === 1
      ? (tests[0].label || tests[0].id || '').toUpperCase()
      : 'LABORATORY TEST REPORT'
  return (
    <Text style={styles.lhTitleBanner} fixed>
      {label}
    </Text>
  )
}

// ---- Drawn letterhead FOOTER (used only when withLetterhead=true) ----
// Redesigned to match the reference layout: a signature row (Lab
// Technician on the left, Pathologist on the right) with a center "Trusted
// Results" badge, disclaimer notes, and a solid navy bottom bar carrying
// the computer-generated note, phone number and page count.
function LetterheadFooter({ styles }) {
  return (
    <View style={styles.lhFooterWrap} fixed>
      <View style={styles.lhSignRow}>
        <View style={styles.lhSignCol}>
          <View style={styles.lhSignLine} />
          {/* <Text style={styles.lhSignName}></Text> */}
          {/* <Text style={styles.lhSignRole}>DMLT, Lab Technician</Text> */}
        </View>

        <View style={styles.lhTrustBadge}>
          <View style={styles.lhTrustIconCircle}>
            <Svg viewBox="0 0 20 20" style={styles.lhVerifiedTick}>
              <Path
                d="M4 10.5 L8 14.5 L16 5.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.lhTrustText}>Trusted Results{'\n'}Better Health</Text>
        </View>

        <View style={styles.lhSignCol}>
          <View style={styles.lhSignLine} />
          <Text style={styles.lhSignName}>Dr. Sanjay Pratap Singh</Text>
          {/* <Text style={styles.lhSignRole}>MD Path, Reg. No. MCI 1345</Text> */}
        </View>
      </View>

      <View style={styles.lhFooterNotes}>
        <Text style={styles.lhFooterNoteLine}>
          Note: All laboratory investigations have inherent limitations. Results may vary due to
          biological variations, sample collection conditions, and methodology used.
        </Text>
      </View>

      <View style={styles.lhFooterBar}>
        <Text style={styles.lhFooterBarItem}>Computer-generated report</Text>
        <Text style={styles.lhFooterBarItem}>Powered by Raj Pathology Center</Text>
        <Text style={styles.lhFooterBarItem}>+91 9936031710</Text>
        <Text
          style={styles.lhFooterBarItem}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`}
        />
      </View>
    </View>
  )
}

// ---- Premium decorative page frame, drawn only for the letterhead
// (QR-scanned / online) version, so the digital copy reads like a
// finished certificate rather than a plain print-out. ----
function LetterheadPageFrame({ styles }) {
  return <View style={styles.lhPageFrame} fixed />
}

// ---- END OF REPORT gating helper -------------------------------------
function hasAnyFilledResult(patient) {
  if (!Array.isArray(patient?.tests)) return false
  return patient.tests.some((t) => {
    const testResults = patient.results?.[t.id]
    return (t.params || []).some((p) => {
      const val = testResults?.params?.[p.key]
      return val !== undefined && val !== null && val !== ''
    })
  })
}

function getStyles(fontRegular, fontBold, resultScale = 1, withLetterhead = false) {
  return StyleSheet.create({
    page: {
      paddingTop: withLetterhead ? MARGIN_TOP_LETTERHEAD : MARGIN_TOP_BLANK,
      paddingBottom: withLetterhead ? MARGIN_BOTTOM_LETTERHEAD : MARGIN_BOTTOM_BLANK,
      paddingHorizontal: 45,
      fontSize: 9.7,
      fontFamily: fontRegular,
      color: TEXT_DARK,
      backgroundColor: '#ffffff',
    },

    // ---- Premium decorative frame (letterhead/digital version only) --
    lhPageFrame: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      bottom: 10,
      borderWidth: 1.4,
      borderColor: LH_NAVY,
      borderRadius: 6,
    },

    // ---- Drawn letterhead header (only used when withLetterhead) ------
    lhHeaderWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 30,
      paddingTop: 18,
    },
    lhBanner: {
      backgroundColor: '#ffffff',
      borderBottomWidth: 2,
      borderBottomColor: LH_NAVY,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    lhLogoCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#eef2f7',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    lhLogoSvg: { width: 24, height: 24 },
    lhClinicBlock: { flex: 1 },
    lhClinicName: {
      fontSize: 13.5,
      fontFamily: fontBold,
      color: LH_NAVY,
      letterSpacing: 0.3,
    },
    lhClinicAddress: {
      fontSize: 7.8,
      color: '#3c3f33',
      marginTop: 2,
      marginBottom: 2,
    },
    lhContactRow: { flexDirection: 'row', alignItems: 'center' },
    lhContactItem: { fontSize: 7.3, color: LH_GRAY },
    lhContactDot: { fontSize: 7.3, color: LH_GRAY, marginHorizontal: 5 },
    lhTaglineBox: {
      backgroundColor: LH_NAVY,
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 110,
    },
    lhTaglineIcon: { width: 16, height: 16, marginBottom: 3 },
    lhTaglineText: {
      fontSize: 7.6,
      fontFamily: fontBold,
      color: '#ffffff',
      textAlign: 'center',
      letterSpacing: 0.2,
    },

    // ---- Test title banner (solid navy strip naming the test) --------
    lhTitleBanner: {
      backgroundColor: LH_NAVY,
      color: '#ffffff',
      fontSize: 10.5,
      fontFamily: fontBold,
      textAlign: 'center',
      paddingVertical: 7,
      letterSpacing: 1.6,
      marginTop: 10,
      marginBottom: 10,
      borderRadius: 3,
    },

    // ---- Footer (only used when withLetterhead) -----------------------
    lhFooterWrap: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 30,
      paddingBottom: 0,
    },
    lhSignRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    lhSignCol: { width: '32%', alignItems: 'center' },
    lhSignLine: {
      width: '100%',
      borderBottomWidth: 0.8,
      borderBottomColor: LINE_BORDER,
      marginBottom: 3,
      height: 14,
    },
    lhSignName: { fontSize: 8.3, fontFamily: fontBold, color: PRIMARY_BLACK, textAlign: 'center' },
    lhSignRole: { fontSize: 6.8, color: LH_GRAY, textAlign: 'center', marginTop: 1 },
    lhTrustBadge: { width: '30%', alignItems: 'center', justifyContent: 'flex-end' },
    lhTrustIconCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: LH_GREEN,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 3,
    },
    lhVerifiedTick: { width: 13, height: 13 },
    lhTrustText: {
      fontSize: 6.6,
      fontFamily: fontBold,
      color: LH_GREEN,
      textAlign: 'center',
      lineHeight: 1.3,
    },
    lhFooterNotes: {
      borderTopWidth: 0.7,
      borderTopColor: LINE_BORDER,
      paddingTop: 5,
      marginBottom: 6,
    },
    lhFooterNoteLine: { fontSize: 6.2, color: LH_GRAY, lineHeight: 1.4 },
    lhFooterBar: {
      backgroundColor: LH_NAVY,
      paddingVertical: 6,
      paddingHorizontal: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    lhFooterBarItem: { fontSize: 6.6, fontFamily: fontBold, color: '#ffffff' },

    patientCard: {
      position: 'relative',
      borderWidth: 1,
      borderColor: '#1a1a1a',
      borderRadius: 4,
      paddingVertical: 10,
      paddingHorizontal: 14,
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      minHeight: 90,
    },

    // ---- LEFT column: Name / Age & Sex / PID, with the QR code
    // pinned to its top-right corner (matches the reference layout). ----
    leftCol: {
      flex: 1,
      position: 'relative',
      paddingRight: 54,
      paddingTop: 3,
    },
    // Small uppercase muted label sitting above the patient's name — same
    // treatment as "Referring Doctor" on the right side, for consistency.
    nameLabel: {
      fontSize: 8.7,
      fontFamily: fontBold,
      color: TEXT_MUTED,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    nameText: {
      fontSize: 10.5,
      fontFamily: fontBold,
      color: PRIMARY_BLACK,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingBottom: 6,
      marginBottom: 8,
    },
    metaRow: {
      flexDirection: 'row',
      marginBottom: 4,
      flexWrap: 'wrap',
    },
    // Divider used only under the Age/Sex row in the patient card, so the
    // "Report Contains" row on the right isn't affected.
    ageSexDivider: {
      borderBottomColor: LINE_BORDER,
      paddingBottom: 6,
      marginBottom: 8,
      borderBottomWidth: 0.8,
    },
    metaItem: {
      flexDirection: 'row',
      marginRight: 18,
      alignItems: 'baseline',
    },
    metaLabel: {
      fontSize: 8.9,
      fontFamily: fontBold,
      color: TEXT_MUTED,
      textTransform: 'uppercase',
    },
    metaColon: {
      width: 8,
      fontSize: 8.5,
      fontFamily: fontBold,
      color: TEXT_MUTED,
    },
    metaValue: {
      fontSize: 9.3,
      fontFamily: fontBold,
      color: PRIMARY_BLACK,
    },

    // ---- QR code: pinned to the top-right corner of the LEFT column ---
    qrCorner: {
      position: 'absolute',
      top: 0,
      right: 2,
      width: 49,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qrCodeImage: {
      width: 36,
      height: 36,
    },
    qrLabel: {
      marginTop: 3,
      fontSize: 5.4,
      fontFamily: fontBold,
      color: TEXT_MUTED,
      textAlign: 'center',
      letterSpacing: 0.3,
    },

    // ---- Barcode under the Patient ID value --------------------------
    barcodeImage: {
      width: 105,
      height: 20,
      marginTop: 3,
    },
    // ---- Barcode placed beside (inline with) the Patient ID value ----
    barcodeImageInline: {
      width: 100,
      height: 16,
      marginLeft: 8,
      flexShrink: 0,
    },

    // ---- RIGHT column: premium referring-doctor / report-summary panel,
    // + footer meta. "Sample Collected At" no longer lives here. ----
    rightCol: {
      flex: 1.1,
      paddingLeft: 20,
      borderLeftWidth: 0.9,
      borderLeftColor: LINE_BORDER,
      justifyContent: 'center',
    },
    sampleLabel: {
      fontSize: 8.7,
      fontFamily: fontBold,
      color: TEXT_MUTED,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 3,
    },
    refByPremium: {
      fontSize: 10.5,
      fontFamily: fontBold,
      color: PRIMARY_BLACK,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingBottom: 6,
      marginBottom: 8,
      borderBottomWidth: 0.8,
      borderBottomColor: LINE_BORDER,
    },
    metaFooterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderTopWidth: 0.8,
      borderTopColor: LINE_BORDER,
      paddingTop: 5,
      marginTop: 10,
    },
    metaFooterItem: {
      fontSize: 8.5,
      fontFamily: fontBold,
      color: TEXT_MUTED,
      marginRight: 39,
    },

    // ---- Digital-report (withLetterhead) patient info grid card ------
    // Mirrors the reference: a bordered card split into a 3-up top row
    // (Patient Name / Age & Gender / Sample Type) and a 3-up bottom row
    // (Collection Date / Reporting Date / Referred By), with the QR code
    // pinned to the top-right corner and labeled "Scan to Verify".
    digCard: {
      position: 'relative',
      borderWidth: 1,
      borderColor: LINE_BORDER,
      borderRadius: 6,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: '#fbfcfe',
    },
    digGridRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    digGridRowSpaced: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderTopWidth: 0.8,
      borderTopColor: LINE_BORDER,
      marginTop: 9,
      paddingTop: 9,
    },
    digField: { width: '33%', paddingRight: 60 },
    digFieldLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    digFieldIconDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: LH_NAVY,
      marginRight: 5,
    },
    digFieldLabel: {
      fontSize: 7.3,
      fontFamily: fontBold,
      color: LH_NAVY,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    digFieldValue: {
      fontSize: 9.6,
      fontFamily: fontBold,
      color: PRIMARY_BLACK,
    },
    digQrCorner: {
      position: 'absolute',
      top: 10,
      right: 14,
      width: 62,
      alignItems: 'center',
    },
    digQrImage: { width: 54, height: 54 },
    digQrLabel: {
      marginTop: 3,
      fontSize: 5.6,
      fontFamily: fontBold,
      color: LH_GRAY,
      textAlign: 'center',
      letterSpacing: 0.3,
    },

    banner: {
      backgroundColor: '#cfcfd0a9',
      lineHeight: 1.4,
      color: '#100f0f',
      fontSize: 10.4,
      fontFamily: fontBold,
      textAlign: 'center',
      paddingVertical: 6,
      letterSpacing: 2,
      marginTop: 9,
    },
    // ---- Section sub-header (e.g. Physical / Chemical / Microscopic Examination) ----
    catLabel: {
      fontSize: 8.5,
      color: TEXT_MUTED,
      marginTop: 16,
      marginBottom: 3,
      fontFamily: fontBold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    catLabelCompact: {
      fontSize: 7.4,
      color: '#5b5b5b',
      marginTop: 4,
      marginBottom: 1,
      marginLeft: 2,
      fontFamily: fontBold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    testSectionTitleWrap: {
      borderBottomWidth: 1,
      borderBottomColor: PRIMARY_BLACK,
      paddingBottom: 4,
      marginBottom: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    testSectionTitle: {
      fontFamily: fontBold,
      fontSize: 11,
      color: PRIMARY_BLACK,
      letterSpacing: 0.4,
      marginTop: 10,
      marginBottom: 2,
    },
    partialNote: {
      fontSize: 9.5,
      color: TEXT_MUTED,
      fontStyle: 'italic',
      marginBottom: 0,
      fontFamily: fontBold,
    },
    serologyDatesRow: {
      flexDirection: 'row',
      gap: 18,
      marginTop: 4,
      marginBottom: 4,
      fontFamily: fontBold,
      paddingLeft: 12,
    },
    serologyDateText: { fontSize: BASE_FONT_SIZE - 0.7, color: TEXT_MUTED },
    table: { width: '100%', marginTop: 5 },
    tableHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: LINE_BORDER,
      paddingVertical: 6,
      paddingHorizontal: 2,
    },
    tableHeaderRowDig: {
      flexDirection: 'row',
      backgroundColor: LH_NAVY,
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: LINE_BORDER,
      paddingVertical: 6,
      paddingHorizontal: 2,
      alignItems: 'center',
    },
    tableRowDig: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: LINE_BORDER,
      paddingVertical: 6,
      paddingHorizontal: 4,
      alignItems: 'center',
    },
    tableRowDigAlt: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: LINE_BORDER,
      paddingVertical: 6,
      paddingHorizontal: 4,
      alignItems: 'center',
      backgroundColor: '#f4f7fb',
    },
    tableRowAbnormal: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: LINE_BORDER,
      paddingVertical: 6,
      paddingHorizontal: 2,
      alignItems: 'center',
    },
    colParam: { width: '40%' },
    colParamExpanded: { width: '58%' },
    colParamDig: { width: '34%' },
    colParamName: { fontSize: BASE_FONT_SIZE * resultScale, color: TEXT_MUTED, fontFamily: fontBold },
    colParamNameDig: { fontSize: BASE_FONT_SIZE * resultScale, color: PRIMARY_BLACK, fontFamily: fontBold },
    colParamMethod: { fontSize: 7.3, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 1.5 },
    colResult: {
      width: '18%',
      fontSize: (BASE_FONT_SIZE + 0.6) * resultScale,
      fontFamily: fontRegular,
      color: TEXT_DARK,
      borderLeftColor: LINE_BORDER,
      paddingLeft: 8,
    },
    colResultDig: {
      width: '17%',
      fontSize: (BASE_FONT_SIZE + 0.6) * resultScale,
      fontFamily: fontBold,
      color: TEXT_DARK,
      paddingLeft: 8,
    },
    colResultExpanded: {
      width: '42%',
      fontSize: (BASE_FONT_SIZE + 0.6) * resultScale,
      fontFamily: fontRegular,
      color: TEXT_DARK,
      borderLeftColor: LINE_BORDER,
      paddingLeft: 8,
    },
    colUnit: {
      width: '15%',
      fontSize: BASE_FONT_SIZE * resultScale,
      color: TEXT_DARK,
      borderLeftColor: LINE_BORDER,
      paddingLeft: 8,
    },
    colUnitDig: {
      width: '15%',
      fontSize: BASE_FONT_SIZE * resultScale,
      color: TEXT_DARK,
      paddingLeft: 8,
    },
    colRange: {
      width: '27%',
      fontSize: BASE_FONT_SIZE * resultScale,
      color: TEXT_MUTED,
      fontFamily: fontBold,
      borderLeftColor: LINE_BORDER,
      paddingLeft: 45,
    },
    colRangeDig: {
      width: '24%',
      fontSize: BASE_FONT_SIZE * resultScale,
      color: TEXT_MUTED,
      fontFamily: fontBold,
      paddingLeft: 8,
    },
    // ---- FLAG column (digital report only) ---------------------------
    colFlag: {
      width: '10%',
      paddingLeft: 6,
      alignItems: 'flex-start',
    },
    colFlagText: {
      fontSize: (BASE_FONT_SIZE - 0.3) * resultScale,
      fontFamily: fontBold,
    },
    headCell: { fontFamily: fontBold, fontSize: 8, color: TEXT_MUTED, letterSpacing: 0.5 },
    headCellDig: { fontFamily: fontBold, fontSize: 7.6, color: '#ffffff', letterSpacing: 0.5 },
    abnormal: {
      color: TEXT_MUTED,
      fontFamily: fontBold,
      fontSize: (BASE_FONT_SIZE + 0.6) * resultScale,
    },
    calcLegend: { fontSize: 7.3, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 3 },
    testNote: { fontSize: 5.8, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 4, marginBottom: 4 },
    remarksBox: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: LINE_BORDER,
      borderRadius: 4,
      padding: 9,
    },
    remarksLabel: { fontFamily: fontBold, fontSize: 9, color: PRIMARY_BLACK, marginBottom: 3 },
    remarksText: { fontSize: 8.7, color: TEXT_DARK },
    endOfReport: {
      textAlign: 'center',
      fontSize: 8.2,
      color: PRIMARY_BLACK,
      marginVertical: 10,
      fontFamily: fontBold,
      letterSpacing: 2,
    },
    pageNumber: {
      position: 'absolute',
      fontSize: 9,
      bottom: 25,
      right: 45,
      color: TEXT_MUTED,
    },

    // ---- Mantoux (Tuberculin Skin Test) special block ----------------
    mantouxWrap: {
      marginTop: 8,
      marginBottom: 10,
      paddingHorizontal: 2,
      paddingVertical: 4,
    },
    mantouxSectionLabel: {
      fontSize: 8.3,
      fontFamily: fontBold,
      color: TEXT_MUTED,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 9,
      marginBottom: 3,
    },
    mantouxDivider: {
      borderBottomWidth: 0.7,
      borderBottomColor: LINE_BORDER,
      marginBottom: 6,
    },
    mantouxTestTitle: {
      fontSize: 9.6,
      fontFamily: fontBold,
      color: PRIMARY_BLACK,
      marginBottom: 7,
      letterSpacing: 0.2,
    },
    mantouxLine: { flexDirection: 'row', marginBottom: 3.5 },
    mantouxLabel: { width: 115, fontSize: 8.7, fontFamily: fontBold, color: TEXT_MUTED },
    mantouxColon: { width: 10, fontSize: 8.7, fontFamily: fontBold, color: PRIMARY_BLACK },
    mantouxValue: { flex: 1, fontSize: 8.7, fontFamily: fontRegular, color: TEXT_DARK },
    mantouxResultBold: { fontFamily: fontBold, color: PRIMARY_BLACK },
    mantouxBodyText: { fontSize: 8.7, color: TEXT_DARK, lineHeight: 1.45, marginBottom: 2 },
    mantouxRefTable: { marginTop: 2 },
    mantouxRefRow: { flexDirection: 'row', marginBottom: 2.5 },
    mantouxRefRange: { width: 95, fontSize: 8.5, color: TEXT_MUTED, fontFamily: fontBold },
    mantouxRefLabel: { fontSize: 8.5, color: TEXT_DARK },

    // ---- HbA1c Reference Table Styles ----------------
    hba1cWrap: {
      marginTop: 10,
      marginBottom: 6,
    },
    hba1cTitle: {
      fontSize: 8.5,
      fontFamily: fontBold,
      color: TEXT_MUTED,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hba1cTable: {
      width: '100%',
      borderWidth: 1,
      borderColor: LINE_BORDER,
      borderRadius: 2,
    },
    hba1cHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#f5f5f5',
      borderBottomWidth: 1,
      borderBottomColor: LINE_BORDER,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    hba1cHeaderCol1: {
      width: '50%',
      fontSize: 8.2,
      fontFamily: fontBold,
      color: PRIMARY_BLACK,
    },
    hba1cHeaderCol2: {
      width: '50%',
      fontSize: 8.2,
      fontFamily: fontBold,
      color: PRIMARY_BLACK,
      textAlign: 'center',
    },
    hba1cRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: LINE_BORDER,
      paddingVertical: 3.5,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    hba1cRowLast: {
      flexDirection: 'row',
      paddingVertical: 3.5,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    hba1cCol1: {
      width: '50%',
      fontSize: 8,
      fontFamily: fontBold,
      color: TEXT_DARK,
    },
    hba1cCol2: {
      width: '50%',
      fontSize: 8,
      fontFamily: fontRegular,
      color: TEXT_DARK,
      textAlign: 'center',
    },

    // ---- Beautiful bordered grid-table look for Urine Routine & Semen
    // Analysis (matches the HbA1C reference table style: full box border,
    // very light header row, tight compact rows so the whole panel fits on
    // one page). Applied ONLY to these two tests. ----
    gridWrap: {
      borderWidth: 0.7,
      borderColor: LINE_BORDER,
      borderRadius: 2,
      marginTop: 4,
    },
    gridHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#fafafa',
      borderBottomWidth: 0.7,
      borderBottomColor: LINE_BORDER,
      paddingVertical: 4.5,
      paddingHorizontal: 2,
    },
    gridHeadCell: {
      fontFamily: fontBold,
      fontSize: 7.4,
      color: '#5b5b5b',
      letterSpacing: 0.4,
    },
    gridRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.7,
      borderBottomColor: LINE_BORDER,
      paddingVertical: 2.5,
      paddingHorizontal: 2,
      alignItems: 'center',
    },
    gridCellBorder: {
      borderLeftWidth: 0.7,
      borderLeftColor: LINE_BORDER,
    },
    gridParamName: {
      fontSize: (BASE_FONT_SIZE - 0.9) * resultScale,
      color: TEXT_MUTED,
      fontFamily: fontBold,
    },
    gridResultText: {
      fontSize: (BASE_FONT_SIZE - 0.3) * resultScale,
      fontFamily: fontBold,
      color: TEXT_MUTED,
    },
    gridUnit: {
      width: '15%',
      fontSize: (BASE_FONT_SIZE - 0.9) * resultScale,
      color: TEXT_DARK,
      paddingLeft: 8,
    },
    gridRange: {
      width: '27%',
      fontSize: (BASE_FONT_SIZE - 0.9) * resultScale,
      color: TEXT_MUTED,
      fontFamily: fontBold,
      paddingLeft: 30,
    },
    gridResultCol: {
      width: '18%',
      paddingLeft: 8,
    },
  })
}

// Capitalizes only the first letter of each word (e.g. "john kumar sharma"
// -> "John Kumar Sharma"). Used for patient-info values (Name, Sex,
// Referring Doctor) so they read as normal Title Case text, while the
// small labels above them (PATIENT NAME, AGE, SEX, PID, REFERRING DOCTOR)
// stay fully uppercase via their own label styles.
function toTitleCase(str) {
  if (!str) return str
  return String(str)
    .toLowerCase()
    .replace(/(^|\s|[-.'])([a-z])/g, (match, sep, ch) => sep + ch.toUpperCase())
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function evaluateFlag(resultStr, range) {
  if (!resultStr || !range) return null
  const r = range.trim()

  let m = r.match(/^([\d.]+)\s*-\s*([\d.]+)/)
  if (m) {
    const val = parseFloat(resultStr)
    if (Number.isNaN(val)) return null
    if (val < parseFloat(m[1])) return 'L'
    if (val > parseFloat(m[2])) return 'H'
    return null
  }

  m = r.match(/^(?:up to|<)\s*([\d.]+)/i)
  if (m) {
    const val = parseFloat(resultStr)
    if (Number.isNaN(val)) return null
    return val > parseFloat(m[1]) ? 'H' : null
  }

  m = r.match(/^>\s*([\d.]+)/)
  if (m) {
    const val = parseFloat(resultStr)
    if (Number.isNaN(val)) return null
    return val < parseFloat(m[1]) ? 'L' : null
  }

  const qualitativeNormal = ['negative', 'non reactive', 'nil', 'normal', 'nonreactive']
  if (qualitativeNormal.includes(r.toLowerCase())) {
    return qualitativeNormal.includes(resultStr.trim().toLowerCase()) ? null : 'ABN'
  }

  return null
}

export default function ReportDocument({
  patient,
  fontRegular = 'Helvetica',
  fontBold = 'Helvetica-Bold',
  resultScale = 1,
  // Default false: no drawn letterhead — used for local print/download,
  // since that flow is printed onto the clinic's pre-printed letterhead
  // paper and the blank top/bottom margin is intentional.
  // Pass true for the QR-scan / online report view, where there's no
  // physical letterhead paper, so the letterhead is drawn into the PDF
  // with a header, patient-info grid, colored FLAG column, and a
  // signature + trust-badge footer (matches the reference digital report).
  withLetterhead = false,
}) {
  const styles = getStyles(fontRegular, fontBold, resultScale, withLetterhead)

  const reportDate = patient.reportDate
    ? formatDisplayDate(patient.reportDate)
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })

  const showQualitativeUnitRange = !!patient?.showQualitativeUnitRange
  const showEndOfReport = hasAnyFilledResult(patient)

  const referredByRaw = (patient.referredBy || '').trim()
  const isSelfReferred = !referredByRaw || referredByRaw.toLowerCase() === 'self'
  const referredByText = isSelfReferred
    ? 'Self'
    : `Dr. ${toTitleCase(referredByRaw.replace(/^Dr\.?\s*/i, ''))}`

  // Right column now leads with a quick "what's in this report" summary
  // instead of the collection address — total investigation count.
  const testCount = patient.tests?.length || 0
  const investigationsSummary = `${testCount} `
  const sampleTypeText = patient.sampleType || patient.specimen || '—'

  return (
    <Document title={`Report - ${patient.name ? patient.name.toUpperCase() : 'PATIENT'}`}>
      <Page size="A4" style={styles.page} wrap>
        {/* Drawn letterhead header + premium decorative frame — only
            rendered when withLetterhead (the QR-scanned digital copy) */}
        {withLetterhead && <LetterheadPageFrame styles={styles} />}
        {withLetterhead && <LetterheadHeader styles={styles} />}

        {withLetterhead ? (
          // ---- Digital-report patient info grid (matches the reference:
          // Patient Name / Age & Gender / Sample Type on top, Collection
          // Date / Reporting Date / Referred By below, QR pinned top-right
          // labeled "Scan to Verify"). ----
          <View style={styles.digCard} fixed>
            <View style={styles.digGridRow}>
              <View style={styles.digField}>
                <View style={styles.digFieldLabelRow}>
                  <View style={styles.digFieldIconDot} />
                  <Text style={styles.digFieldLabel}>Patient Name</Text>
                </View>
                <Text style={styles.digFieldValue}>{toTitleCase(patient.name)}</Text>
              </View>
              <View style={styles.digField}>
                <View style={styles.digFieldLabelRow}>
                  <View style={styles.digFieldIconDot} />
                  <Text style={styles.digFieldLabel}>Age / Gender</Text>
                </View>
                <Text style={styles.digFieldValue}>
                  {String(patient.age).toUpperCase() === 'NA' ? 'NA' : `${patient.age}Y`} /{' '}
                  {toTitleCase(patient.gender)}
                </Text>
              </View>
              <View style={styles.digField}>
                <View style={styles.digFieldLabelRow}>
                  <View style={styles.digFieldIconDot} />
                  <Text style={styles.digFieldLabel}>Sample Type</Text>
                </View>
                <Text style={styles.digFieldValue}>{toTitleCase(sampleTypeText)}</Text>
              </View>
            </View>

            <View style={styles.digGridRowSpaced}>
              <View style={styles.digField}>
                <View style={styles.digFieldLabelRow}>
                  <View style={styles.digFieldIconDot} />
                  <Text style={styles.digFieldLabel}>Collection Date</Text>
                </View>
                <Text style={styles.digFieldValue}>{formatDisplayDate(patient.sampleDate) || '—'}</Text>
              </View>
              <View style={styles.digField}>
                <View style={styles.digFieldLabelRow}>
                  <View style={styles.digFieldIconDot} />
                  <Text style={styles.digFieldLabel}>Reporting Date</Text>
                </View>
                <Text style={styles.digFieldValue}>{reportDate}</Text>
              </View>
              <View style={styles.digField}>
                <View style={styles.digFieldLabelRow}>
                  <View style={styles.digFieldIconDot} />
                  <Text style={styles.digFieldLabel}>Referred By</Text>
                </View>
                <Text style={styles.digFieldValue}>{referredByText}</Text>
              </View>
            </View>

            {patient.qrCodeDataUrl ? (
              <View style={styles.digQrCorner}>
                <Image src={patient.qrCodeDataUrl} style={styles.digQrImage} />
                <Text style={styles.digQrLabel}>SCAN TO VERIFY</Text>
              </View>
            ) : null}
          </View>
        ) : (
          // ---- Original patient info card, used for the pre-printed /
          // blank-letterhead paper flow — unchanged. ----
          <View style={styles.patientCard} fixed>
            <View style={styles.leftCol}>
              <Text style={styles.nameLabel}>Patient Name :</Text>
              <Text style={styles.nameText}>{toTitleCase(patient.name)}</Text>

              <View style={[styles.metaRow, styles.ageSexDivider]}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Age</Text>
                  <Text style={styles.metaColon}>:</Text>
                  <Text style={styles.metaValue}>
                    {String(patient.age).toUpperCase() === 'NA' ? 'NA' : `${patient.age} Years`}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Sex</Text>
                  <Text style={styles.metaColon}>:</Text>
                  <Text style={styles.metaValue}>{toTitleCase(patient.gender)}</Text>
                </View>
              </View>

              <View style={[styles.metaRow, { alignItems: 'center', flexWrap: 'nowrap' }]}>
                <View style={[styles.metaItem, { flexShrink: 0 }]}>
                  <Text style={styles.metaLabel}>PID</Text>
                  <Text style={styles.metaColon}>:</Text>
                  <Text style={styles.metaValue}>{patient.id}</Text>
                </View>

                {patient.barcodeDataUrl ? (
                  <Image src={patient.barcodeDataUrl} style={styles.barcodeImageInline} />
                ) : null}
              </View>

              {patient.qrCodeDataUrl ? (
                <View style={styles.qrCorner}>
                  <Image src={patient.qrCodeDataUrl} style={styles.qrCodeImage} />
                  <Text style={styles.qrLabel}>SCAN TO VIEW</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.rightCol}>
              <Text style={styles.sampleLabel}>Referred By :</Text>
              <Text style={styles.refByPremium}>{referredByText}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Investigations</Text>
                  <Text style={styles.metaColon}>:</Text>
                  <Text style={styles.metaValue}>{investigationsSummary}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>date</Text>
                  <Text style={styles.metaColon}>:</Text>
                  <Text style={styles.metaFooterItem}>{formatDisplayDate(patient.sampleDate) || '—'}</Text>
                </View>
              </View>

              <View style={styles.metaFooterRow}>
                <Text style={styles.metaFooterItem}>Report: {reportDate}</Text>
                <Text style={styles.metaFooterItem}>Status: Final</Text>
              </View>
            </View>
          </View>
        )}

        {withLetterhead ? (
          <TestTitleBanner styles={styles} patient={patient} />
        ) : (
          <Text style={styles.banner} fixed>
            {' '}
            LABORATORY TEST REPORT
          </Text>
        )}

        {/* Dynamic Test Reports Body */}
        <View>
          {patient.tests?.map((t) => {
            const catalogTest = findTest(t.id)
            const testResults = patient.results?.[t.id]
            const hasCalc = t.params.some(
              (p) => catalogTest?.params.find((cp) => cp.key === p.key)?.calc
            )

            const forceShowUnitRange = !!catalogTest?.showUnitRangeAlways

            // Urine Routine (mixed panel: qualitative + numeric params) never
            // collapses UNIT/RANGE — needed so every row stays aligned.
            const isUrineRoutineTest =
              t.id?.toLowerCase().includes('urine') || t.label?.toLowerCase().includes('urine')
            const isSemenTest =
              t.id?.toLowerCase().includes('semen') || t.label?.toLowerCase().includes('semen')

            // The beautiful bordered grid-table treatment — ONLY for Urine
            // Routine and Semen Analysis, nothing else (CBC, Serology, etc.
            // stay exactly as before). Not used at all on the digital
            // (withLetterhead) report, which always uses the FLAG-column
            // table so the reference layout is consistent across tests.
            const isGridPanel = !withLetterhead && (isUrineRoutineTest || isSemenTest)

            // Collapse UNIT/RANGE header ONLY when EVERY param in the test is
            // qualitative (true qualitative-only panel like Serology) — a test
            // with just one qualitative param should not collapse the whole
            // section. On the digital report we always keep the FLAG column
            // visible, so we never collapse there.
            const allParamsQualitative =
              t.params.length > 0 &&
              t.params.every((p) => {
                const val = testResults?.params?.[p.key]
                return isQualitativeResult(val)
              })

            const hideHeaderUnitRange =
              !withLetterhead &&
              !isGridPanel &&
              allParamsQualitative &&
              !showQualitativeUnitRange &&
              !forceShowUnitRange

            const isHbA1cTest = t.id?.toLowerCase().includes('hba1c') || t.label?.toLowerCase().includes('hba1c')

            // Section grouping (e.g. "PHYSICAL EXAMINATION" / "CHEMICAL
            // EXAMINATION" / "MICROSCOPIC EXAMINATION" for Urine Routine &
            // Semen Analysis). The catalog (tests.js) puts this on a param's
            // `section` field — read that field here (this used to check
            // `p.category`, which the catalog never sets, so these headers
            // never printed).
            let lastSection = null
            let digRowIndex = 0

            const renderParamRow = (p) => {
              const val = testResults?.params?.[p.key]
              const paramDef = catalogTest?.params.find((cp) => cp.key === p.key)

              const sectionLabel = p.section || paramDef?.section
              const showSectionHeader = !!sectionLabel && sectionLabel !== lastSection
              if (showSectionHeader) lastSection = sectionLabel
              const sectionLabelNode = showSectionHeader ? (
                <Text style={isGridPanel ? styles.catLabelCompact : styles.catLabel}>{sectionLabel}</Text>
              ) : null

              // ---- Special-case block: Mantoux Test -----------------
              if (p.reportBlock === 'mantoux' || paramDef?.reportBlock === 'mantoux') {
                const inductionVal = testResults?.paramInduration?.[p.key]
                const pDatesM = testResults?.paramDates?.[p.key]
                const { interpretation, comment } = getMantouxInterpretation(val)

                return (
                  <View key={p.key} style={styles.mantouxWrap} wrap={false}>
                    <Text style={styles.mantouxSectionLabel}>Investigation</Text>
                    <View style={styles.mantouxDivider} />
                    <Text style={styles.mantouxTestTitle}>MANTOUX TEST (Tuberculin Skin Test)</Text>

                    <View style={styles.mantouxLine}>
                      <Text style={styles.mantouxLabel}>Date of Testing</Text>
                      <Text style={styles.mantouxColon}>:</Text>
                      <Text style={styles.mantouxValue}>{formatDisplayDate(pDatesM?.testingDate) || '—'}</Text>
                    </View>
                    <View style={styles.mantouxLine}>
                      <Text style={styles.mantouxLabel}>Date of Reading</Text>
                      <Text style={styles.mantouxColon}>:</Text>
                      <Text style={styles.mantouxValue}>{formatDisplayDate(pDatesM?.readingDate) || '—'}</Text>
                    </View>
                    <View style={styles.mantouxLine}>
                      <Text style={styles.mantouxLabel}>Induration</Text>
                      <Text style={styles.mantouxColon}>:</Text>
                      <Text style={styles.mantouxValue}>{inductionVal ? `${inductionVal} mm` : '—'}</Text>
                    </View>
                    <View style={styles.mantouxLine}>
                      <Text style={styles.mantouxLabel}>Result</Text>
                      <Text style={styles.mantouxColon}>:</Text>
                      <Text style={[styles.mantouxValue, styles.mantouxResultBold]}>
                        {val ? val.toUpperCase() : '—'}
                      </Text>
                    </View>

                    <Text style={styles.mantouxSectionLabel}>Interpretation</Text>
                    <View style={styles.mantouxDivider} />
                    <Text style={styles.mantouxBodyText}>{interpretation}</Text>

                    <Text style={styles.mantouxSectionLabel}>Comment</Text>
                    <View style={styles.mantouxDivider} />
                    <Text style={styles.mantouxBodyText}>{comment}</Text>

                    <Text style={styles.mantouxSectionLabel}>Reference</Text>
                    <View style={styles.mantouxDivider} />
                    <View style={styles.mantouxRefTable}>
                      <View style={styles.mantouxRefRow}>
                        <Text style={styles.mantouxRefRange}>0 – 4 mm</Text>
                        <Text style={styles.mantouxRefLabel}>Negative</Text>
                      </View>
                      <View style={styles.mantouxRefRow}>
                        <Text style={styles.mantouxRefRange}>5 – 9 mm</Text>
                        <Text style={styles.mantouxRefLabel}>Borderline</Text>
                      </View>
                      <View style={styles.mantouxRefRow}>
                        <Text style={styles.mantouxRefRange}>10 – 14 mm</Text>
                        <Text style={styles.mantouxRefLabel}>Positive</Text>
                      </View>
                      <View style={styles.mantouxRefRow}>
                        <Text style={styles.mantouxRefRange}>{'>= 15 mm'}</Text>
                        <Text style={styles.mantouxRefLabel}>Strongly Positive</Text>
                      </View>
                    </View>
                  </View>
                )
              }

              // ---- Normal row rendering ------------------------------
              const flag = val !== undefined && val !== null && val !== '' ? evaluateFlag(val, p.range) : null
              const isCalc = !!paramDef?.calc

              const isQualitative = isQualitativeResult(val)
              const forceBold = !!paramDef?.bold

              // Urine Routine / Semen Analysis never collapse to the
              // expanded 2-column layout, even for their qualitative rows —
              // full 4-column grid always, so the box-table stays aligned.
              // The digital (withLetterhead) report never collapses either,
              // since its FLAG column needs every row in the same shape.
              const isCurrentRowExpanded =
                !withLetterhead && !isGridPanel && isQualitative && !showQualitativeUnitRange && !forceShowUnitRange

              const rowStyle = withLetterhead
                ? digRowIndex % 2 === 1
                  ? styles.tableRowDigAlt
                  : styles.tableRowDig
                : isGridPanel
                ? styles.gridRow
                : flag
                ? styles.tableRowAbnormal
                : styles.tableRow
              digRowIndex += 1

              const paramNameStyle = withLetterhead
                ? styles.colParamNameDig
                : isGridPanel
                ? styles.gridParamName
                : styles.colParamName

              const resultBaseStyle = withLetterhead
                ? styles.colResultDig
                : isCurrentRowExpanded
                ? styles.colResultExpanded
                : isGridPanel
                ? styles.gridResultCol
                : styles.colResult

              const unitStyle = withLetterhead ? styles.colUnitDig : isGridPanel ? styles.gridUnit : styles.colUnit
              const rangeStyle = withLetterhead ? styles.colRangeDig : isGridPanel ? styles.gridRange : styles.colRange

              const flagDisplay = withLetterhead ? getFlagDisplay(flag) : null

              return (
                // Each row is its own wrap={false} block — this is what lets a
                // long panel (Urine Routine / Semen Analysis) flow naturally
                // onto the next page when it doesn't fit, instead of the
                // whole panel needing to fit on one page.
                <View key={p.key} wrap={false}>
                  {sectionLabelNode}

                  {/* Parameter and Result Row */}
                  <View style={rowStyle}>
                    <View
                      style={
                        withLetterhead
                          ? styles.colParamDig
                          : isCurrentRowExpanded
                          ? styles.colParamExpanded
                          : styles.colParam
                      }
                    >
                      <Text style={paramNameStyle}>
                        {p.name}
                        {isCalc ? ' †' : ''}
                      </Text>
                      {p.method && <Text style={styles.colParamMethod}>{p.method}</Text>}
                    </View>

                    <Text
                      style={[
                        resultBaseStyle,
                        isGridPanel && styles.gridCellBorder,
                        isGridPanel && !flag && !forceBold && styles.gridResultText,
                        !withLetterhead && (flag || forceBold) && styles.abnormal,
                        withLetterhead && flagDisplay && { color: flagDisplay.color },
                      ]}
                    >
                      {val || '—'}
                    </Text>

                    {(withLetterhead || !isCurrentRowExpanded) && (
                      <>
                        <Text style={[unitStyle, isGridPanel && styles.gridCellBorder]}>{p.unit || '—'}</Text>
                        <Text style={[rangeStyle, isGridPanel && styles.gridCellBorder]}>{p.range || '—'}</Text>
                      </>
                    )}

                    {withLetterhead && (
                      <View style={styles.colFlag}>
                        <Text style={[styles.colFlagText, { color: flagDisplay.color }]}>
                          {flagDisplay.arrow}
                          {flagDisplay.label}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            }

            return (
              // The test itself is a plain View (no wrap={false} on the whole
              // block) so it can break across a page when it doesn't fit —
              // only its title+header pair below is kept atomic so a header
              // never gets stranded alone at the bottom of a page.
              <View key={t.id} wrap={false}>
                <View wrap={false}>
                  {!withLetterhead && (
                    <View style={[styles.testSectionTitleWrap, !t.full && { marginTop: 12 }]}>
                      {t.full && <Text style={styles.testSectionTitle}>{t.label?.toUpperCase()}</Text>}
                    </View>
                  )}

                  <View
                    style={
                      isGridPanel
                        ? { borderWidth: 0.7, borderColor: LINE_BORDER, borderBottomWidth: 0 }
                        : undefined
                    }
                  >
                    <View style={withLetterhead ? styles.tableHeaderRowDig : isGridPanel ? styles.gridHeaderRow : styles.tableHeaderRow}>
                      <Text
                        style={
                          withLetterhead
                            ? [styles.colParamDig, styles.headCellDig]
                            : hideHeaderUnitRange
                            ? [styles.colParamExpanded, isGridPanel ? styles.gridHeadCell : styles.headCell]
                            : [styles.colParam, isGridPanel ? styles.gridHeadCell : styles.headCell]
                        }
                      >
                        {withLetterhead ? 'TEST NAME' : 'INVESTIGATION'}
                      </Text>

                      <Text
                        style={[
                          withLetterhead
                            ? styles.colResultDig
                            : hideHeaderUnitRange
                            ? styles.colResultExpanded
                            : isGridPanel
                            ? styles.gridResultCol
                            : styles.colResult,
                          isGridPanel && styles.gridCellBorder,
                          withLetterhead ? styles.headCellDig : isGridPanel ? styles.gridHeadCell : styles.headCell,
                        ]}
                      >
                        RESULT
                      </Text>

                      {(withLetterhead || !hideHeaderUnitRange) && (
                        <>
                          <Text
                            style={[
                              withLetterhead ? styles.colUnitDig : isGridPanel ? styles.gridUnit : styles.colUnit,
                              isGridPanel && styles.gridCellBorder,
                              withLetterhead ? styles.headCellDig : isGridPanel ? styles.gridHeadCell : styles.headCell,
                            ]}
                          >
                            UNIT
                          </Text>
                          <Text
                            style={[
                              withLetterhead ? styles.colRangeDig : isGridPanel ? styles.gridRange : styles.colRange,
                              isGridPanel && styles.gridCellBorder,
                              withLetterhead ? styles.headCellDig : isGridPanel ? styles.gridHeadCell : styles.headCell,
                            ]}
                          >
                            {withLetterhead ? 'NORMAL RANGE' : 'BIO. REF. RANGE'}
                          </Text>
                        </>
                      )}

                      {withLetterhead && (
                        <View style={styles.colFlag}>
                          <Text style={styles.headCellDig}>FLAG</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={isGridPanel ? styles.gridWrap : styles.table}>
                  {t.params?.map((p) => renderParamRow(p))}
                </View>

                {/* HbA1c Reference Table Attachment */}
                {isHbA1cTest && <HbA1cReferenceTable styles={styles} />}

                {/* Footer notes for the test */}
                {hasCalc && <Text style={styles.calcLegend}>† Auto-calculated value</Text>}
                {catalogTest?.note && <Text style={styles.testNote}>Note: {catalogTest.note}</Text>}
              </View>
            )
          })}

          {patient.remarks ? (
            <View style={styles.remarksBox} wrap={false}>
              <Text style={styles.remarksLabel}>Comments / Remarks</Text>
              <Text style={styles.remarksText}>{patient.remarks}</Text>
            </View>
          ) : null}

          {showEndOfReport && (
            <Text style={styles.endOfReport} wrap={false}>
              --- END OF REPORT ---
            </Text>
          )}
        </View>

        {/* Drawn letterhead footer — only rendered when withLetterhead */}
        {withLetterhead && <LetterheadFooter styles={styles} />}

        {!withLetterhead && (
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            fixed
          />
        )}
      </Page>
    </Document>
  )
}

/*
=======================================================================
USAGE — how to wire this up
=======================================================================

1) Local print / download (Report.jsx) — now a CHECKBOX-driven choice.
   Report.jsx keeps a `withLetterhead` state (default false = "Without
   Letterhead", for printing on the clinic's pre-printed letterhead
   paper). Ticking the checkbox flips it to render the premium drawn
   letterhead in the same preview/download instead:

     <ReportDocument
       patient={preparedPatient}
       fontRegular={...}
       fontBold={...}
       resultScale={...}
       withLetterhead={withLetterhead}
     />

   With this update, ticking that box now also switches the patient-info
   card to the grid layout (with icons + "Scan to Verify" QR corner), adds
   the colored H/L/N FLAG column to every results table, and swaps the
   footer for the two-signature + trust-badge + navy bottom bar layout —
   matching the reference "HealthPlus Diagnostics"-style digital report.

2) QR-scan / online report view — the QR code embedded in the PDF
   (built by prepareReportCodes()) now always appends a `?letterhead=1`
   marker to the report URL, regardless of the checkbox above, since a
   phone screen has no physical pre-printed paper behind it. Your public
   "/report/:id" route should read that query param and render:

     <ReportDocument patient={preparedPatient} withLetterhead />

   or, server-side, when generating the buffer for that public route:

     const buffer = await generateReportPdfBuffer(patient, {
       docProps: { withLetterhead: true },
     })

3) If you want to fine-tune the letterhead content (doctor name, phone
   numbers, email, address) it's all hard-coded at the top of
   LetterheadHeader / LetterheadFooter in this file — replace those with
   values from patient.clinic or a config object if you want it
   data-driven instead.
=======================================================================
*/