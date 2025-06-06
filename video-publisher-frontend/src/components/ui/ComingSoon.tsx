import React from 'react';

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: string;
}

export function ComingSoon({ title, description, icon }: ComingSoonProps) {
  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="dashboard-card coming-soon-card">
          <div className="coming-soon-content">
            {icon && (
              <div className="coming-soon-icon">
                <svg width="64" height="64" fill="currentColor" viewBox="0 0 20 20">
                  <path d={icon} />
                </svg>
              </div>
            )}
            <h3 className="coming-soon-title">Coming Soon</h3>
            <p className="coming-soon-description">
              This feature is currently under development and will be available soon.
            </p>
            <div className="coming-soon-badge">
              <span>🚀 In Development</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
