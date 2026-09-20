// Master diagnostic test catalog for the lab.
//
// Structure: an array of CATEGORIES. Each category has a `head` (section
// title), a `subHead` (subtitle) and a list of `tests`. Each test is a
// panel (e.g. "Complete Blood Count (CBC)") made up of one or more
// `params`. A param's normal `range` can differ by gender — it is given
// as { A } (applies to everyone) or { M, F } (male / female specific).
//
// - `shortLabel`: compact abbreviation for tight UI spots (Dashboard tags).
// - `note`: a general one-line comment printed on the report under that
//   test's table (pre-analytical / interpretive caveat).
// - a param's `method`: a short method/assay description printed under
//   the parameter name on the report (e.g. "Rapid Chromatographic
//   Immunoassay for qualitative detection...").
// - a param's `calc(nums)`: marks it as AUTO-CALCULATED from other
//   params in the same test (e.g. MCV/MCH/MCHC, LDL/VLDL, Globulin).
// - a param's `subGroup`: groups consecutive params under one visual
//   sub-heading on the report/UI (e.g. Motility's PR/NP/IM/Total rows,
//   Morphology's Normal/Abnormal rows). Purely presentational — does
//   not affect pricing or calc logic.
// - a param's `section`: prints a bold, underlined section header on
//   the report above the first param of that section (e.g. "Physical
//   Examination :-", "Chemical Examination :-", "Microscopic
//   Examination :-" — as used in Semen Analysis and Urine Routine &
//   Microscopic Examination). Purely presentational.
// - `serology: true` on a test: collects a Date of Testing / Date of
//   Reading alongside the normal result rows.
// - `showUnitRangeAlways: true` on a test: forces the UNIT and BIO.
//   REF. RANGE columns to always print/display for this test, even
//   when its results are qualitative words (Absent/Present/Trace/etc.)
//   that would normally trigger the "expanded result" qualitative
//   layout. Use this for panels like Urine Routine & Microscopic
//   Examination where most rows are qualitative BUT the unit/range
//   context is still clinically useful to show.
//
// NOTE ON PARAM KEYS: every param `key` inside a given test must be
// unique WITHIN that test, but must ALSO be unique ACROSS the whole
// catalog if two tests can realistically be ordered together for the
// same patient. Results/values are stored keyed by (testId -> paramKey),
// so two different tests sharing the exact same param key is fine as
// long as they're never both selected at once — but the moment a
// patient orders both, only one of them can safely be responsible for
// that key's stored value. `s_ca` (Serum Calcium) used to be duplicated
// between `kft` and `electrolytes`; it has been given a distinct key in
// `electrolytes` (`s_ca_elec`) to remove that collision risk. Likewise,
// `preg_card` (the standalone Pregnancy Card Test) is deliberately
// keyed differently from `preg` (the pregnancy param inside
// `antenatal`), since a patient could plausibly be ordered for both.
// `mp_card` and `dengue_card` are the dedicated standalone rapid card
// tests for Malaria and Dengue respectively; the `vectorBorne` panel no
// longer carries its own MP/Dengue params (order the standalone card
// tests alongside it if both are needed).
//
// Individual parameter ordering: any test with more than one parameter
// can be ordered as the FULL PANEL (at the panel price below) or as a
// custom pick of individual parameters, each priced with
// `individualParamPrice()`.

export const CATALOG = [
  {
    head: 'Hemogram & Coagulation Profile',
    subHead: 'Complete Blood Count (CBC) & Bleeding Parameters',
    tests: [
      {
        key: 'cbc',
        label: 'Complete Blood Count (CBC)',
        shortLabel: 'CBC',
        price: 300,
        note: 'Values may vary with altitude, hydration status, and time of sample collection.',
        params: [
          { key: 'hb', name: 'Hemoglobin (Hb)', unit: 'g/dL', range: { M: '13.5 - 16.0', F: '11.5 - 15.0' } },
          { key: 'tlc', name: 'Total Leukocyte Count (WBC)', unit: 'cells/cumm', range: { A: '4000 - 11000' } },
          { key: 'poly', name: 'Polymorphs', unit: '%', range: { A: '55 - 70' } },
          { key: 'lymph', name: 'Lymphocytes', unit: '%', range: { A: '25 - 55' } },
          { key: 'eos', name: 'Eosinophils', unit: '%', range: { A: '1 - 6' } },
          { key: 'mono', name: 'Monocytes', unit: '%', range: { A: '1 - 5' } },
          { key: 'baso', name: 'Basophils', unit: '%', range: { A: '0 - 0.5' } },
          { key: 'plt', name: 'Platelet Count', unit: 'lacs/cumm', range: { A: '1.50 - 4.0' } },
          { key: 'rbc', name: 'RBC Count', unit: 'mill/cumm', range: { A: '4.5 - 5.5' } },
          { key: 'hct', name: 'Hematocrit (HCT/PCV)', unit: '%', range: { A: '40 - 50' } },
          {
            key: 'mcv', name: 'MCV', unit: 'fL', range: { A: '83 - 101' },
            calc: (v) => (v.hct != null && v.rbc) ? (v.hct / v.rbc) * 10 : null,
          },
          {
            key: 'mch', name: 'MCH', unit: 'pg', range: { A: '27 - 32' },
            calc: (v) => (v.hb != null && v.rbc) ? (v.hb / v.rbc) * 10 : null,
          },
          {
            key: 'mchc', name: 'MCHC', unit: 'g/dL', range: { A: '31.5 - 34.5' },
            calc: (v) => (v.hb != null && v.hct) ? (v.hb / v.hct) * 100 : null,
          },
          { key: 'rdw', name: 'RDW', unit: '%', range: { A: '11.5 - 14.5' } },
        ],
      },
      {
        key: 'coag',
        label: 'Coagulation Window',
        shortLabel: 'BT/CT/PT',
        price: 200,
        note: 'Reference values may vary by laboratory method; interpret with clinical correlation.',
        params: [
          { key: 'bt', name: 'Bleeding Time (BT)', unit: 'min/sec', range: { A: '1 - 4 mt' } },
          { key: 'ct', name: 'Coagulation Time (CT)', unit: 'min/sec', range: { A: '2 - 7 mt' } },
          { key: 'pt', name: 'Prothrombin Time (PT)', unit: 'sec', range: { A: 'up to 14' } },
        ],
      },
    ],
  },
  {
    head: 'Metabolic & Blood Sugar Profiles',
    subHead: 'Diabetes, Glucose Tolerance & Lipids',
    tests: [
      {
        key: 'bloodSugar',
        label: 'Blood Sugar Screening',
        shortLabel: 'Sugar',
        price: 100,
        note: 'Fasting requires 8-10 hours without caloric intake; PP is measured 2 hours after a meal.',
        params: [
          { key: 'fbs', name: 'Fasting Blood Sugar', unit: 'mg/dL', range: { A: '70 - 120' } },
          { key: 'ppbs', name: 'PP Blood Sugar (2 hrs after meal)', unit: 'mg/dL', range: { A: '70 - 140' } },
          { key: 'rbs', name: 'Random Blood Sugar', unit: 'mg/dL', range: { A: '70 - 140' } },
        ],
      },
      {
        key: 'hba1c',
        label: 'Glycosylated Hemoglobin (HbA1c)',
        shortLabel: 'HbA1c',
        price: 400,
        note: 'HbA1c reflects average blood glucose levels over the preceding 2–3 months. Interpret with clinical context.',
        params: [
          {
            key: 'hba1c',
            name: 'Glycosylated Haemoglobin (HbA1c)',
            unit: '%',
            range: { A: '< 6.0' },
            method: 'HPLC / Immunoturbidimetric Assay',
            bold: true,
          },
          {
            key: 'eag',
            name: 'Estimated Average Glucose (eAG)',
            unit: 'mg/dL',
            range: { A: '70 - 114' },
            calc: (v) => (v.hba1c != null && v.hba1c > 0) ? (28.7 * v.hba1c - 46.7) : null,
          },
        ],
        reportRefRanges: [
          { label: 'Non Diabetic Level', range: '< 6.0 %' },
          { label: 'Goal', range: '< 7.0 %' },
          { label: 'Action Suggested', range: '> 8.0 %' }
        ]
      },
      {
        key: 'gtt',
        label: 'Glucose Tolerance Test (GTT)',
        shortLabel: 'GTT',
        price: 400,
        note: 'Test should be performed after an overnight fast with a standard 75g oral glucose load.',
        params: [
          { key: 'gtt_30', name: 'Blood Sugar (1/2 hr after 75g Glucose)', unit: 'mg/dL', range: { A: 'Up to 200' } },
          { key: 'gtt_60', name: 'Blood Sugar (1 hr after 75g Glucose)', unit: 'mg/dL', range: { A: 'Up to 180' } },
          { key: 'gtt_120', name: 'Blood Sugar (2 hrs after 75g Glucose)', unit: 'mg/dL', range: { A: '70 - 140' } },
        ],
      },
      {
        key: 'lipid',
        label: 'Lipid Profile',
        shortLabel: 'Lipid',
        price: 500,
        note: 'A minimum 9-12 hour fast is recommended prior to sample collection for accurate lipid values.',
        params: [
          { key: 'chol', name: 'Serum Cholesterol', unit: 'mg/dL', range: { A: '130 - 200' } },
          { key: 'hdl', name: 'Serum HDL', unit: 'mg/dL', range: { A: '30 - 70' } },
          { key: 'tg', name: 'Serum Triglyceride', unit: 'mg/dL', range: { A: '36 - 165' } },
          {
            key: 'ldl', name: 'Serum LDL', unit: 'mg/dL', range: { A: '65 - 130' },
            calc: (v) => (v.chol != null && v.hdl != null && v.tg != null) ? v.chol - v.hdl - v.tg / 5 : null,
          },
          {
            key: 'vldl', name: 'Serum VLDL', unit: 'mg/dL', range: { A: '7 - 40' },
            calc: (v) => (v.tg != null) ? v.tg / 5 : null,
          },
          {
            key: 'tcHdlRatio', name: 'TC / HDL Ratio', unit: '', range: { A: '< 5.0' },
            calc: (v) => (v.chol != null && v.hdl) ? v.chol / v.hdl : null,
          },
          {
            key: 'ldlHdlRatio', name: 'LDL / HDL Ratio', unit: '', range: { A: '< 3.5' },
            calc: (v) => (v.ldl != null && v.hdl) ? v.ldl / v.hdl : null,
          },
        ],
      },
    ],
  },
  {
    head: 'Organ Function Tests & Electrolytes',
    subHead: 'Kidney, Liver, Electrolyte Panels & Cardiac Markers',
    tests: [
      {
        key: 'kft',
        label: 'Kidney Function Test (KFT)',
        shortLabel: 'KFT',
        price: 350,
        note: 'Renal function should be interpreted with clinical findings.',
        params: [
          { key: 'b_urea', name: 'Blood Urea', unit: 'mg/dL', range: { A: '10 - 50' } },
          { key: 's_creat', name: 'Serum Creatinine', unit: 'mg/dL', range: { A: '0.6 - 1.4' } },
          {
            key: 'uric_acid',
            name: 'Serum Uric Acid',
            unit: 'mg/dL',
            range: { M: '3.5 - 7.2', F: '2.6 - 6.0' }
          },
          { key: 's_ca', name: 'Serum Calcium', unit: 'mg/dL', range: { A: '8.5 - 10.5' } }
        ]
      },
      {
        key: 'lft',
        label: 'Liver Function Test (LFT)',
        shortLabel: 'LFT',
        price: 450,
        note: 'Liver enzyme levels may be transiently elevated by exercise, medication, or alcohol intake.',
        params: [
          { key: 'bil_t', name: 'Serum Bilirubin (Total)', unit: 'mg%', range: { A: '0.3 - 1.2' } },
          { key: 'sgot', name: 'S.G.O.T. (AST)', unit: 'IU/L', range: { A: '8 - 40' } },
          { key: 'sgpt', name: 'S.G.P.T. (ALT)', unit: 'IU/L', range: { A: '5 - 35' } },
          { key: 'alk_phos', name: 'Serum Alkaline Phosphatase', unit: 'IU/L', range: { A: '37 - 147' } },
          { key: 's_prot', name: 'Serum Protein', unit: 'g/dL', range: { A: '6 - 8' } },
          { key: 's_alb', name: 'Serum Albumin', unit: 'g/dL', range: { A: '3.5 - 5.5' } },
          {
            key: 'glob', name: 'Globulin', unit: 'g/dL', range: { A: '2.3 - 3.1' },
            calc: (v) => (v.s_prot != null && v.s_alb != null) ? v.s_prot - v.s_alb : null,
          },
          {
            key: 'ag_ratio', name: 'A/G Ratio', unit: 'ratio', range: { A: '1.0 - 2.3' },
            calc: (v) => (v.s_alb != null && v.glob) ? v.s_alb / v.glob : null,
          },
        ],
      },
      {
        key: 'electrolytes',
        label: 'Electrolytes & Enzymes',
        shortLabel: 'Electrolytes',
        price: 300,
        note: 'Hemolysis of the sample can falsely elevate potassium and other analyte levels.',
        params: [
          // FIX: was `key: 's_ca'` — duplicated the `kft` test's Serum
          // Calcium key. If a patient was ordered both KFT and
          // Electrolytes & Enzymes together, both param objects wrote
          // into the SAME `s_ca` slot inside `values`/`selections`,
          // silently overwriting one result with the other whenever
          // either was edited. Renamed to a key unique to this test.
          { key: 's_ca_elec', name: 'Serum Calcium', unit: 'mg/dL', range: { A: '8.5 - 10.5' } },
          { key: 's_na', name: 'Serum Sodium (Na+)', unit: 'meq/L', range: { A: '135 - 145' } },
          { key: 's_k', name: 'Serum Potassium (K+)', unit: 'meq/L', range: { A: '3.5 - 5.5' } },
          { key: 's_cl', name: 'Serum Chloride', unit: 'mmol/L', range: { A: '98 - 107' } },
          { key: 's_phos', name: 'Serum Phosphorus', unit: 'mg/dL', range: { A: '2.5 - 5.0' } },
          { key: 's_amylase', name: 'Serum Amylase', unit: 'U/L', range: { A: '<86' } },
          { key: 's_lipase', name: 'Serum Lipase', unit: 'U/L', range: { A: '22 - 51' } },
        ],
      },
      {
        key: 'cardiac',
        label: 'Cardiac Markers',
        shortLabel: 'Cardiac',
        price: 600,
        note: 'Serial sampling is recommended for cardiac markers in suspected acute coronary events.',
        params: [
          { key: 'cpk_mb', name: 'CPK-MB (Nac act)', unit: 'U/L', range: { A: 'Up to 24' } },
          {
            key: 'trop_t', name: 'Troponin-T', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid immunochromatographic test for cardiac Troponin-T.',
          },
        ],
      },
    ],
  },
  {
    head: 'Infectious Disease Serology',
    subHead: 'Fever Panels & Viral Markers',
    tests: [
      {
        key: 'typhoid',
        label: 'Typhoid Screening (Widal Test)',
        shortLabel: 'Widal',
        price: 250,
        serology: true,
        note: 'Results should be interpreted in conjunction with the patient’s clinical history and other laboratory investigations. A single Widal test has limited diagnostic value.',
        params: [
          {
            key: 'to',
            name: 'S. Typhi "O"',
            type: 'select',
            options: [ '1:20', '1:40', '1:80', '1:160', '1:320' ],
          },
          {
            key: 'th',
            name: 'S. Typhi "H"',
            type: 'select',
            options: ['1:20', '1:40', '1:80', '1:160', '1:320'],
          },
          {
            key: 'ah',
            name: 'S. Paratyphi "AH"',
            type: 'select',
            options: ['Zero', '1:20', '1:40', '1:80'],
          },
          {
            key: 'bh',
            name: 'S. Paratyphi "BH"',
            type: 'select',
            options: ['Zero', '1:20', '1:40', '1:80'],
          },
          {
            key: 'result',
            name: 'Result',
            type: 'select',
            options: ['Negative', 'Positive','Borderline'],
            unit: '',
            bold: true
          }
        ],
      },
      {
        key: 'widal_card',
        label: 'Typhoid Screening (Widal Card Test)',
        shortLabel: 'Widal Card',
        price: 150,
        serology: true,
        note: 'Rapid qualitative screening test. A reactive result should be confirmed with the quantitative slide/tube Widal test for titer levels.',
        params: [
          {
            key: 'widal_card_to',
            name: 'S. Typhi "O" Antigen',
            type: 'select',
            options: ['Negative', 'Positive'],
            unit: 'Qualitative',
            range: { A: 'Negative' },
            method: 'Rapid slide agglutination card test for qualitative detection of typhoid antibodies.',
          },
          {
            key: 'widal_card_th',
            name: 'S. Typhi "H" Antigen',
            type: 'select',
            options: ['Negative', 'Positive'],
            unit: 'Qualitative',
            range: { A: 'Negative' },
          },
        ],
      },
      {
        key: 'mp_card',
        label: 'Malaria Parasite (MP) Card Test',
        shortLabel: 'MP Card',
        price: 200,
        serology: true,
        note: 'Rapid qualitative screening test for malarial antigens. Confirm with peripheral blood smear examination where clinically indicated.',
        params: [
          {
            key: 'mp_card_antigen', name: 'MP Antigen', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid immunochromatographic card test for qualitative detection of malarial antigen.',
          },
          {
            key: 'mp_card_vivax', name: 'Plasmodium vivax (P. vivax)', unit: 'Qualitative', range: { A: 'Negative' },
          },
          {
            key: 'mp_card_falciparum', name: 'Plasmodium falciparum (P. falciparum)', unit: 'Qualitative', range: { A: 'Negative' },
          },
        ],
      },
      {
        key: 'dengue_card',
        label: 'Dengue Card Test',
        shortLabel: 'Dengue Card',
        price: 300,
        serology: true,
        note: 'Rapid qualitative screening test. A reactive result should be correlated with clinical presentation and confirmed if required.',
        params: [
          {
            key: 'dengue_card_ns1', name: 'Dengue NS1 Ag', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid immunochromatographic card test for qualitative detection of Dengue NS1 antigen.',
          },
          {
            key: 'dengue_card_igm', name: 'Dengue IgM', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid card test for qualitative detection of IgM antibodies to Dengue virus.',
          },
          {
            key: 'dengue_card_igg', name: 'Dengue IgG', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid card test for qualitative detection of IgG antibodies to Dengue virus.',
          },
        ],
      },
      {
        key: 'vectorBorne',
        label: 'Vector Borne & Respiratory Panel',
        shortLabel: 'Fever Panel',
        price: 400,
        serology: true,
        note: 'Results should be interpreted alongside clinical presentation and local disease prevalence; repeat testing may be advised if clinically indicated.',
        params: [
          {
            key: 'chiku_igm', name: 'Chikungunya Test IgM', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid test for qualitative detection of IgM antibodies to Chikungunya virus.',
          },
          {
            key: 'fil_card', name: 'Micro Filaria (MF) Card Test', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid card test for qualitative detection of filarial antigen.',
          },
          { key: 'sputum_afb', name: 'Sputum For AFB (3 Days)', unit: 'Qualitative', range: { A: 'Negative' } },
        ],
      },
      {
        key: 'montoux',
        label: 'Montoux Test (Tuberculin Skin Test)',
        shortLabel: 'Montoux',
        price: 150,
        serology: true,
        note: 'Induration should be read 48-72 hours after intradermal injection; interpret alongside clinical risk factors for tuberculosis exposure.',
        params: [
          {
            key: 'montoux',
            name: 'Montoux Test (Tuberculin Skin Test)',
            unit: 'Qualitative',
            range: { A: 'Negative' },
            isSerology: true,
            hasInduration: true,
            bold: true,
            reportBlock: 'mantoux',
            type: 'select',
            options: ['Negative', 'Borderline', 'Positive', 'Strongly Positive'],
          },
        ],
      },
      {
        key: 'hepatitis',
        label: 'Hepatitis & Retroviral Status',
        shortLabel: 'HIV/HBsAg/HCV',
        price: 500,
        serology: true,
        note: 'This is a screening test. Reactive/positive results should be confirmed with a supplementary or confirmatory assay.',
        params: [
          {
            key: 'hiv', name: 'Human Immunodeficiency Virus (HIV I & II)', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid test for qualitative detection of antibodies to HIV-1 & HIV-2.',
          },
          {
            key: 'hcv', name: 'Hepatitis C Virus (HCV)', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid test for qualitative detection of antibodies to HCV.',
          },
          {
            key: 'hbsag', name: 'Hepatitis B Surface Antigen (HBsAg)', unit: 'Qualitative', range: { A: 'Non Reactive' },
            method: 'Rapid test for qualitative detection of Hepatitis B surface antigen.',
          },
          {
            key: 'vdrl', name: 'VDRL (Syphilis Qualitative)', unit: 'Qualitative', range: { A: 'Non Reactive' },
            method: 'Flocculation test for qualitative screening of Syphilis.',
          },
        ],
      },
    ],
  },
  {
    head: 'Arthritis & Special Parameters',
    subHead: 'Autoimmune Panel & Pregnancy Status',
    tests: [
      {
        key: 'arthritis',
        label: 'Arthritis Profile',
        shortLabel: 'Arthritis',
        price: 450,
        serology: true,
        note: 'Elevated titers should be correlated with clinical findings; a single result is not diagnostic of any specific condition.',
        params: [
          {
            key: 'uric_acid',
            name: 'Serum Uric Acid',
            unit: 'mg%',
            range: { M: '3.5 - 7.2', F: '2.6 - 6.0' },
          },
          {
            key: 'r',
            name: 'Rheumatoid Factor (RA Factor)',
            type: 'select',
            options: ['Negative', 'Positive'],
            unit: '',
            range: { A: 'Negative' },
            bold: true,
            method: 'Latex agglutination test for qualitative detection of Rheumatoid Factor.',
          },
          {
            key: 'rf', name: 'Rheumatoid Factor (RA) Quantitative', unit: 'U/L', range: { A: 'Up to 20' },
            method: 'Latex agglutination test for quantitative estimation of Rheumatoid Factor.',
          },
          {
            key: 'aso', name: 'ASO Titer (Quantitative)', unit: 'U/L', range: { A: 'Up to 200' },
            method: 'Latex agglutination test for quantitative estimation of Anti-Streptolysin O.',
          },
          {
            key: 'crp', name: 'C-Reactive Protein (CRP) Quantitative', unit: 'mg/L', range: { A: 'Up to 6' },
            method: 'Latex agglutination test for quantitative estimation of C-Reactive Protein.',
          },
          { key: 'micral', name: 'Urine For Micral Test', unit: 'mg/L', range: { A: 'Up to 20' } },
        ],
      },
      {
        key: 'esr',
        label: 'Erythrocyte Sedimentation Rate (ESR)',
        shortLabel: 'ESR',
        price: 100,
        note: 'ESR is a non-specific marker of inflammation and should be interpreted in conjunction with clinical findings and other laboratory investigations.',
        params: [
          {
            key: 'esr',
            name: 'E.S.R. (1st Hour)',
            unit: 'mm/hr',
            range: {
              M: '0 - 10',
              F: '0 - 20'
            }
          }
        ]
      },
      {
        key: 'antenatal',
        label: 'Antenatal / Special Markers',
        shortLabel: 'BG/Preg',
        price: 150,
        serology: true,
        note: 'Blood group typing should be reconfirmed at the time of any transfusion or delivery.',
        params: [
          { key: 'bg', name: 'Blood Group & Rh', unit: 'Qualitative', range: { A: 'A/B/AB/O Pos/Neg' } },
          {
            key: 'preg', name: 'Urine For Pregnancy - Test', unit: 'Qualitative', range: { A: 'Negative' },
            method: 'Rapid immunochromatographic test for qualitative detection of urine hCG.',
          },
        ],
      },
      {
        key: 'preg_card',
        label: 'Urine Pregnancy Test (Card Method)',
        shortLabel: 'Preg Card',
        price: 150,
        serology: true,
        note: 'A first-morning urine sample is preferred for optimal test sensitivity.',
        params: [
          {
            key: 'preg_card',
            name: 'Urine For Pregnancy Test (hCG)',
            type: 'select',
            options: ['Negative', 'Positive'],
            unit: 'Qualitative',
            range: { A: 'Negative' },
            method: 'Rapid immunochromatographic card test for qualitative detection of urine hCG (Human Chorionic Gonadotropin).',
            bold: true,
          },
        ],
      },
    ],
  },
  {
    head: 'Pathology, Urine & Seminal Fluid Analysis',
    subHead: 'Urine Routine, Semen Analysis & Reproductive Parameters',
    tests: [
      {
        key: 'semen_analysis',
        label: 'Semen Analysis',
        shortLabel: 'Semen Analysis',
        price: 300,
        reportBlock: 'semen',
        showUnitRangeAlways: true,
        note: 'A minimum of 2-3 days (not exceeding 7 days) of sexual abstinence is recommended prior to collection.',
        params: [
          // ---- Physical Examination ----
          {
            key: 'colour',
            name: 'Colour',
            type: 'select',
            options: ['Whitish Grey', 'Greyish White', 'Yellowish', 'Translucent', 'Opaque', 'Blood Tinged'],
            unit: '',
            range: { A: 'Whitish Grey' },
            section: 'Physical Examination',
          },
          {
            key: 'consistency',
            name: 'Consistency',
            type: 'select',
            options: ['Liquid', 'Viscous', 'Coagulated', 'Watery'],
            unit: '',
            range: { A: 'Liquid' },
          },
          {
            key: 'reaction',
            name: 'Reaction',
            type: 'select',
            options: ['Acidic', 'Neutral', 'Alkaline'],
            unit: '',
            range: { A: 'Alkaline' },
          },
          { key: 'quantity', name: 'Quantity (Qnty)', unit: 'ml', range: { A: '1.5 - 5.0' } },

          // ---- Microscopic Examination ----
          {
            key: 'total_count', name: 'Total Count', unit: 'Million cu/mm', range: { A: '15 - 200' },
            section: 'Microscopic Examination',
          },
          { key: 'motility', name: 'Motility', unit: '%', range: { A: '> 40%' } },
          {
            key: 'morphology',
            name: 'Morphology',
            type: 'select',
            options: ['Normal', 'Abnormal'],
            unit: '',
            range: { A: 'Normal (> 4%)' },
          },
          { key: 'other', name: 'Other (Pus Cells)', unit: '/ HPF', range: { A: '0 - 5' } },
        ],
      },
      {
        key: 'urine_routine',
        label: 'Urine Routine & Microscopic Examination',
        shortLabel: 'Urine R/M',
        price: 150,
        reportBlock: 'urine',
        showUnitRangeAlways: true,
        note: 'A freshly voided, clean-catch mid-stream sample is recommended for accurate results.',
        params: [
          // ---- Physical Examination ----
          {
            key: 'u_colour',
            name: 'Colour',
            type: 'select',
            options: ['Pale Yellow', 'Straw', 'Yellow', 'Dark Yellow', 'Amber', 'Red', 'Smoky'],
            unit: '',
            range: { A: 'Pale Yellow - Straw' },
            section: 'Physical Examination',
          },
          {
            key: 'u_appearance',
            name: 'Appearance',
            type: 'select',
            options: ['Clear', 'Slightly Turbid', 'Turbid', 'Hazy'],
            unit: '',
            range: { A: 'Clear' },
          },
          // { key: 'u_sp_gravity', name: 'Specific Gravity', unit: '', range: { A: '1.003 - 1.030' } },
          {
            key: 'u_sediment',
            name: 'Sediment',
            type: 'select',
            options: ['Absent', 'Scanty', 'Present'],
            unit: '',
            range: { A: 'Absent' },
          },

          // ---- Chemical Examination ----
          {
            key: 'u_reaction',
            name: 'Reaction (pH)',
            type: 'select',
            options: ['Acidic', 'Neutral', 'Alkaline'],
            unit: 'pH',
            range: { A: '4.5 - 8.0 (Acidic)' },
            section: 'Chemical Examination',
          },
          {
            key: 'u_albumin',
            name: 'Albumin',
            type: 'select',
            options: ['Absent', 'Trace', '+', '++', '+++'],
            unit: 'Qualitative',
            range: { A: 'Absent' },
          },
          {
            key: 'u_sugar',
            name: 'Sugar',
            type: 'select',
            options: ['Absent', 'Trace', '+', '++', '+++'],
            unit: 'Qualitative',
            range: { A: 'Absent' },
          },
          {
            key: 'u_bile_salt',
            name: 'Bile Salt',
            type: 'select',
            options: ['Absent', 'Present'],
            unit: 'Qualitative',
            range: { A: 'Absent' },
          },
          {
            key: 'u_bile_pigment',
            name: 'Bile Pigment',
            type: 'select',
            options: ['Absent', 'Present'],
            unit: 'Qualitative',
            range: { A: 'Absent' },
          },
          {
            key: 'u_acetone',
            name: 'Acetone Bodies',
            type: 'select',
            options: ['Absent', 'Trace', 'Present'],
            unit: 'Qualitative',
            range: { A: 'Absent' },
          },
          {
            key: 'u_blood',
            name: 'Blood',
            type: 'select',
            options: ['Absent', 'Present'],
            unit: 'Qualitative',
            range: { A: 'Absent' },
          },

          // ---- Microscopic Examination ----
          {
            key: 'u_epithelial', name: 'Epithelial Cells', unit: '/ HPF', range: { A: '0 - 2' },
            section: 'Microscopic Examination',
          },
          { key: 'u_pus_cells', name: 'Pus Cells', unit: '/ HPF', range: { A: '0 - 5' } },
          { key: 'u_rbc', name: 'R.B.C.', unit: '/ HPF', range: { A: 'Nil' } },
          {
            key: 'u_crystals',
            name: 'Crystals',
            type: 'select',
            options: ['NAD', 'Occasional Ca Oxalate', 'Occasional Urate', 'Present'],
            unit: '/ HPF',
            range: { A: 'NAD' },
          },
          {
            key: 'u_casts',
            name: 'Casts',
            type: 'select',
            options: ['NAD', 'Hyaline', 'Granular', 'Present'],
            unit: '/ LPF',
            range: { A: 'NAD' },
          },
          { key: 'u_other', name: 'Other', unit: '', range: { A: 'NAD' } },
        ],
      },
    ],
  },
]

// ---- Helpers -------------------------------------------------------

export function resolveRange(range, gender) {
  if (!range) return ''
  if (range.A) return range.A
  if (gender === 'Female') return range.F || range.M || ''
  return range.M || range.F || ''
}

const PARAM_PRICE_MULTIPLIER = 1.4
const PARAM_PRICE_FLOOR = 50

export function individualParamPrice(test) {
  const raw = (test.price / test.params.length) * PARAM_PRICE_MULTIPLIER
  return Math.max(PARAM_PRICE_FLOOR, Math.round(raw / 10) * 10)
}

export function computeCalculated(test, rawParams) {
  const nums = {}
  test.params.forEach((p) => {
    const f = parseFloat(rawParams[p.key])
    nums[p.key] = Number.isNaN(f) ? null : f
  })
  const out = { ...rawParams }
  test.params.forEach((p) => {
    if (typeof p.calc === 'function') {
      const v = p.calc(nums)
      const rounded =
        v === null || v === undefined || Number.isNaN(v) ? '' : (Math.round(v * 100) / 100).toString()
      out[p.key] = rounded
      nums[p.key] = rounded === '' ? null : parseFloat(rounded)
    }
  })
  return out
}

export const ALL_TESTS = CATALOG.flatMap((cat) =>
  cat.tests.map((t) => ({ ...t, catHead: cat.head, catSubHead: cat.subHead }))
)

export const findTest = (key) => ALL_TESTS.find((t) => t.key === key)