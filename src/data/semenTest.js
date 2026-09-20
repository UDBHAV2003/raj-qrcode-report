import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'

// --- 1. Test Definition Object (For registration in data/tests.js) ---
export const semenAnalysisTest = {
  id: 'semen_analysis',
  label: 'Semen Analysis',
  category: 'PATHOLOGY',
  note: 'Severe Oligospermia',
  params: [
    // Physical Parameters
    { key: 'colour', name: 'Colour', unit: '', range: 'Whitish Grey', isCategoryHeader: 'Physical' },
    { key: 'consistency', name: 'Consistency', unit: '', range: 'Liquid' },
    { key: 'reaction', name: 'Reaction', unit: '', range: 'Alkaline' },
    { key: 'quantity', name: 'Quantity (Qnty)', unit: 'ml', range: '1.5 - 5.0' },

    // Microscopic Parameters
    { key: 'total_count', name: 'Total Count', unit: 'Million cu/mm', range: '15 - 200', isCategoryHeader: 'Microscopic' },
    { key: 'motility', name: 'Motility', unit: '%', range: '> 40%' },
    { key: 'morphology', name: 'Morphology', unit: '', range: 'Normal (> 4%)' },
    { key: 'other', name: 'Other (Pus Cells)', unit: '/ HPF', range: '0 - 5' },
  ],
}

// --- 2. Stylesheet ---
const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  categoryHeader: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#211f1fef',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  rowAbnormal: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  colParam: {
    width: '40%',
  },
  paramName: {
    fontSize: 8.7,
    fontFamily: 'Helvetica-Bold',
    color: '#211f1fef',
  },
  colResult: {
    width: '18%',
    fontSize: 9.3,
    fontFamily: 'Helvetica',
    color: '#000000',
    borderLeftColor: '#9ca3af',
    paddingLeft: 8,
  },
  colResultAbnormal: {
    width: '18%',
    fontSize: 9.3,
    fontFamily: 'Helvetica-Bold',
    color: '#211f1fef',
    borderLeftColor: '#9ca3af',
    paddingLeft: 8,
  },
  colUnit: {
    width: '15%',
    fontSize: 8.7,
    color: '#000000',
    borderLeftColor: '#9ca3af',
    paddingLeft: 8,
  },
  colRange: {
    width: '27%',
    fontSize: 8.7,
    fontFamily: 'Helvetica-Bold',
    color: '#211f1fef',
    borderLeftColor: '#9ca3af',
    paddingLeft: 45,
  },
  noteBox: {
    marginTop: 8,
    padding: 6,
    borderWidth: 0.8,
    borderColor: '#9ca3af',
    borderRadius: 3,
  },
  noteText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
})

// --- 3. React-PDF Component Renderer ---
export function SemenReportBlock({ testResults }) {
  const params = testResults?.params || {}

  const physicalGroup = [
    { label: 'Colour', value: params.colour || 'Whitish Grey', unit: '', range: 'Whitish Grey' },
    { label: 'Consistency', value: params.consistency || 'Liquid', unit: '', range: 'Liquid' },
    { label: 'Reaction', value: params.reaction || 'Alkaline', unit: '', range: 'Alkaline' },
    { label: 'Quantity', value: params.quantity || '3.0', unit: 'ml', range: '1.5 - 5.0' },
  ]

  const microscopicGroup = [
    { label: 'Total Count', value: params.total_count || '45', unit: 'Million cu/mm', range: '15 - 200' },
    { label: 'Motility', value: params.motility || '40%', unit: '', range: '> 40%' },
    { label: 'Morphology', value: params.morphology || 'ABNORMAL', unit: '', range: 'Normal', isAbnormal: true },
    { label: 'Other', value: params.other || 'Pus cells 6 - 8', unit: '/ HPF', range: '0 - 5', isAbnormal: true },
  ]

  const renderRowGroup = (title, items) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.categoryHeader}>{title} Examination</Text>
      {items.map((item, idx) => (
        <View key={idx} style={item.isAbnormal ? styles.rowAbnormal : styles.row}>
          <View style={styles.colParam}>
            <Text style={styles.paramName}>{item.label}</Text>
          </View>
          <Text style={item.isAbnormal ? styles.colResultAbnormal : styles.colResult}>
            {item.value}
          </Text>
          <Text style={styles.colUnit}>{item.unit || '—'}</Text>
          <Text style={styles.colRange}>{item.range || '—'}</Text>
        </View>
      ))}
    </View>
  )

  return (
    <View wrap={false}>
      {renderRowGroup('Physical', physicalGroup)}
      {renderRowGroup('Microscopic', microscopicGroup)}
      
      <View style={styles.noteBox}>
        <Text style={styles.noteText}>Note :- Severe Oligospermia</Text>
      </View>
    </View>
  )
}

export default semenAnalysisTest