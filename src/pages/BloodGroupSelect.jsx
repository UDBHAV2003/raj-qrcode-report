import React from 'react';

const BloodGroupSelect = ({ value, onChange, disabled }) => {
  // भारत और वैश्विक स्तर पर उपयोग होने वाले सामान्य ब्लड ग्रुप्स की लिस्ट
  const bloodGroups = [
    'A Positive (A+)',
    'A Negative (A-)',
    'B Positive (B+)',
    'B Negative (B-)',
    'AB Positive (AB+)',
    'AB Negative (AB-)',
    'O Positive (O+)',
    'O Negative (O-)'
  ];

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="blood-group-select-container" style={{ marginBottom: '15px' }}>
      <label 
        htmlFor="blood-group-select" 
        style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}
      >
        Blood Group & Rh
      </label>
      <select
        id="blood-group-select"
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '14px',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <option value="" disabled>Select Blood Group</option>
        {bloodGroups.map((group) => (
          <option key={group} value={group}>
            {group}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BloodGroupSelect;