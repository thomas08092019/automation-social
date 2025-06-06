import React, { useState, useEffect } from 'react';
import { useNotification } from '../../hooks/useNotification';
import { NotificationContainer } from '../../components/ui/NotificationContainer';

export function SettingsPage() {
  const [startColor, setStartColor] = useState('#667eea');
  const [endColor, setEndColor] = useState('#764ba2');
  const [selectedPreset, setSelectedPreset] = useState('667eea-764ba2');
  const { notifications, addNotification, removeNotification } = useNotification();

  const colorPresets = [
    { id: '667eea-764ba2', start: '#667eea', end: '#764ba2' },
    { id: 'f093fb-f5576c', start: '#f093fb', end: '#f5576c' },
    { id: '4facfe-00f2fe', start: '#4facfe', end: '#00f2fe' },
    { id: '43e97b-38f9d7', start: '#43e97b', end: '#38f9d7' },
    { id: 'fa709a-fee140', start: '#fa709a', end: '#fee140' },
    { id: 'a8edea-fed6e3', start: '#a8edea', end: '#fed6e3' },
    { id: 'ffecd2-fcb69f', start: '#ffecd2', end: '#fcb69f' },
    { id: 'ff8a80-ff5722', start: '#ff8a80', end: '#ff5722' },
  ];

  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedStartColor = localStorage.getItem('customStartColor');
    const savedEndColor = localStorage.getItem('customEndColor');
    const savedPreset = localStorage.getItem('selectedPreset');

    if (savedStartColor && savedEndColor) {
      setStartColor(savedStartColor);
      setEndColor(savedEndColor);
    }
    if (savedPreset) {
      setSelectedPreset(savedPreset);
    }
  };

  const updateColorPreview = (start: string, end: string) => {
    const preview = document.getElementById('colorPreview');
    const textPreview = document.getElementById('textPreview');
    
    if (preview) {
      preview.style.background = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
    }
    if (textPreview) {
      textPreview.style.background = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
      textPreview.style.webkitBackgroundClip = 'text';
      textPreview.style.webkitTextFillColor = 'transparent';
      textPreview.style.backgroundClip = 'text';
    }
  };

  const handlePresetClick = (preset: any) => {
    setSelectedPreset(preset.id);
    setStartColor(preset.start);
    setEndColor(preset.end);
    updateColorPreview(preset.start, preset.end);
  };

  const handleCustomColorChange = (type: 'start' | 'end', color: string) => {
    if (type === 'start') {
      setStartColor(color);
      updateColorPreview(color, endColor);
    } else {
      setEndColor(color);
      updateColorPreview(startColor, color);
    }
    // Clear preset selection when using custom colors
    setSelectedPreset('');
  };

  const resetColors = () => {
    const defaultStart = '#667eea';
    const defaultEnd = '#764ba2';
    setStartColor(defaultStart);
    setEndColor(defaultEnd);
    setSelectedPreset('667eea-764ba2');
    updateColorPreview(defaultStart, defaultEnd);
  };
  const applyColors = () => {
    try {
      // Save to localStorage
      localStorage.setItem('customStartColor', startColor);
      localStorage.setItem('customEndColor', endColor);
      localStorage.setItem('selectedPreset', selectedPreset);

      // Update CSS custom properties
      document.documentElement.style.setProperty('--primary-start', startColor);
      document.documentElement.style.setProperty('--primary-end', endColor);
      document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`);

      addNotification({
        message: 'Color theme applied successfully!',
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      addNotification({
        message: 'Failed to apply color theme. Please try again.',
        type: 'error',
        duration: 5000
      });
    }
  };

  // Initialize preview on component mount
  useEffect(() => {
    updateColorPreview(startColor, endColor);
  }, [startColor, endColor]);
  return (
    <>
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      <div className="settings-container">
      {/* Color Theme Settings */}
      <div className="dashboard-card">
        <h3 className="card-title">Color Theme</h3>
        <p className="card-description">Choose your preferred color scheme</p>
        
        <div className="setting-group">
          <label className="setting-label">Primary Color</label>
          <div className="color-picker-group">
            <div className="color-presets">
              {colorPresets.map((preset) => (
                <div
                  key={preset.id}
                  className={`color-preset ${selectedPreset === preset.id ? 'active' : ''}`}
                  style={{
                    background: `linear-gradient(135deg, ${preset.start} 0%, ${preset.end} 100%)`
                  }}
                  onClick={() => handlePresetClick(preset)}
                  data-color={preset.id}
                />
              ))}
            </div>
            <div className="custom-color-section">
              <label className="setting-label">Or pick custom colors:</label>
              <div className="custom-color-inputs">
                <div className="color-input-group">
                  <label>Start Color</label>
                  <input
                    type="color"
                    value={startColor}
                    onChange={(e) => handleCustomColorChange('start', e.target.value)}
                    id="startColor"
                  />
                </div>
                <div className="color-input-group">
                  <label>End Color</label>
                  <input
                    type="color"
                    value={endColor}
                    onChange={(e) => handleCustomColorChange('end', e.target.value)}
                    id="endColor"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="setting-group">
          <label className="setting-label">Color Preview</label>
          <div className="color-preview">
            <div className="preview-button" id="colorPreview">
              <span>Sample Button</span>
            </div>
            <div className="preview-text" id="textPreview">Sample Text with Gradient</div>
          </div>
        </div>

        <div className="setting-actions">
          <button className="btn-reset" onClick={resetColors} id="resetColors">
            Reset to Default
          </button>          <button className="btn-apply" onClick={applyColors} id="applyColors">
            Apply Changes
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
