import React from 'react';
import { SearchIcon, ResetIcon } from '../social/SocialIcons';
import './DataTableControls.css';

interface FilterConfig {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

interface DataTableControlsProps {
  // Search
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  
  // Filters
  filters?: FilterConfig[];
    // Actions
  onRefresh?: () => void;
  onReset?: () => void;
  isLoading?: boolean;
  
  // Custom content
  children?: React.ReactNode;
}

export function DataTableControls({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters = [],
  onRefresh,
  onReset,
  isLoading = false,
  children
}: DataTableControlsProps) {
  const handleReset = () => {
    // Reset search
    onSearchChange('');
    
    // Reset all filters
    filters.forEach(filter => filter.onChange(''));
    
    // Call custom reset if provided
    if (onReset) {
      onReset();
    }
  };
  return (
    <div className="dashboard-card" style={{ marginTop: '24px', marginBottom: '36px' }}>
      <div className="search-section">
        <div className="search-filters">
          {/* Search Input */}
          <div className="search-input-group">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="search-input"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          
          {/* Filter Controls */}
          {filters.map((filter) => (
            <select
              key={filter.key}
              className="filter-select"
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}            {/* Reset Button */}
          <button
            className="reset-btn"
            onClick={handleReset}
            disabled={isLoading}
            title="Reset Filters"
          >
            <ResetIcon />
          </button>
        </div>
        
        {/* Custom Content */}
        {children}
      </div>
    </div>
  );
}
