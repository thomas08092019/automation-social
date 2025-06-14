import React, { useState, useEffect } from 'react';
import { showNotification } from '../../utils/notification';

export function SettingsPage() {
  const [startColor, setStartColor] = useState('#667eea');
  const [endColor, setEndColor] = useState('#764ba2');
  const [selectedPreset, setSelectedPreset] = useState('667eea-764ba2');

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
  const applyColorTheme = (startColor: string, endColor: string) => {
    const gradient = `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`;
    
    // Update CSS custom properties
    document.documentElement.style.setProperty('--primary-gradient', gradient);
    document.documentElement.style.setProperty('--primary-start', startColor);
    document.documentElement.style.setProperty('--primary-end', endColor);
    
    // Create or update dynamic style element
    let dynamicStyle = document.getElementById('dynamic-theme-style');
    if (!dynamicStyle) {
      dynamicStyle = document.createElement('style');
      dynamicStyle.id = 'dynamic-theme-style';
      document.head.appendChild(dynamicStyle);
    }
      const css = `
      .nav-link.active,
      .toggle-btn,
      .user-avatar,
      .preview-button,
      .btn-apply {
        background: ${gradient} !important;
      }
      
      .content-header {
        background: ${gradient} !important;
      }
      
      .content-header .page-title {
        color: white !important;
      }
      
      .content-header .theme-toggle {
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
        border-color: rgba(255, 255, 255, 0.3) !important;
      }
      
      body.dark .content-header .theme-toggle {
        background: rgba(255, 255, 255, 0.15) !important;
        color: white !important;
        border-color: rgba(255, 255, 255, 0.25) !important;
      }
      
      .preview-text,
      .logo {
        background: ${gradient} !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      
      .btn-apply:hover {
        box-shadow: 0 6px 16px ${startColor}40 !important;
      }
      
      .toggle-btn:hover {
        box-shadow: 0 4px 12px ${startColor}50 !important;
      }
      
      .coming-soon-icon {
        background: ${gradient} !important;
        box-shadow: 0 8px 32px ${startColor}50 !important;
      }
      
      .copyright {
        background: ${gradient} !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
        font-weight: 600 !important;
      }
    `;
    
    dynamicStyle.textContent = css;
  };

  const loadSettings = () => {
    const savedStartColor = localStorage.getItem('customStartColor');
    const savedEndColor = localStorage.getItem('customEndColor');
    const savedPreset = localStorage.getItem('selectedPreset');

    if (savedStartColor && savedEndColor) {
      setStartColor(savedStartColor);
      setEndColor(savedEndColor);
      // Apply the saved theme immediately
      applyColorTheme(savedStartColor, savedEndColor);
      updateColorPreview(savedStartColor, savedEndColor);
    }
    if (savedPreset) {
      setSelectedPreset(savedPreset);
    }
  };  const updateColorPreview = (start: string, end: string) => {
    // Update CSS custom properties for immediate live preview across the entire page
    document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${start} 0%, ${end} 100%)`);
    document.documentElement.style.setProperty('--primary-start', start);
    document.documentElement.style.setProperty('--primary-end', end);
  };
  const handlePresetClick = (preset: any) => {
    setSelectedPreset(preset.id);
    setStartColor(preset.start);
    setEndColor(preset.end);
    updateColorPreview(preset.start, preset.end);
    // Apply color theme immediately for live preview
    applyColorTheme(preset.start, preset.end);
  };
  const handleCustomColorChange = (type: 'start' | 'end', color: string) => {
    if (type === 'start') {
      setStartColor(color);
      updateColorPreview(color, endColor);
      // Apply color theme immediately for live preview
      applyColorTheme(color, endColor);
    } else {
      setEndColor(color);
      updateColorPreview(startColor, color);
      // Apply color theme immediately for live preview
      applyColorTheme(startColor, color);
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
    // Apply default color theme immediately
    applyColorTheme(defaultStart, defaultEnd);
  };const applyColors = () => {
    try {
      // Save to localStorage
      localStorage.setItem('customStartColor', startColor);
      localStorage.setItem('customEndColor', endColor);
      localStorage.setItem('selectedPreset', selectedPreset);      // Apply color theme to entire application
      applyColorTheme(startColor, endColor);

      showNotification('Color theme applied successfully!', 'success');
    } catch (error) {
      showNotification('Failed to apply color theme. Please try again.', 'error');
    }
  };

  // Initialize preview on component mount
  useEffect(() => {
    updateColorPreview(startColor, endColor);
  }, [startColor, endColor]);  return (
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
          </div>        </div>

        <div className="setting-actions">
          <button className="btn-reset" onClick={resetColors} id="resetColors">
            Reset to Default
          </button>          <button className="btn-apply" onClick={applyColors} id="applyColors">
            Apply Changes
          </button>        </div>
      </div>
    </div>
  );
}
