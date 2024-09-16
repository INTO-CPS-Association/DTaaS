import * as React from 'react';
import { useState, SetStateAction, useEffect } from 'react';

function PreviewTab() {
  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    setInputValue('call here function to get the data');
  }, []);

  const handleChange = (e: { target: { value: SetStateAction<string> } }) => {
    setInputValue(e.target.value);
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#f5f5f5',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
      />
    </div>
  );
}

export default PreviewTab;
