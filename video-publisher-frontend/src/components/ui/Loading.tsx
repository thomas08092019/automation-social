import React from 'react';

interface LoadingProps {
  text?: string;
  subtitle?: string;
  type?: 'spinner' | 'circular' | 'dots';
  size?: 'small' | 'medium' | 'large';
}

export function Loading({ 
  text = 'Loading...', 
  subtitle = 'Please wait while we prepare your content',
  type = 'spinner',
  size = 'medium'
}: LoadingProps) {
  const renderLoadingIcon = () => {
    switch (type) {
      case 'circular':
        return <div className="circular-spinner" />;
      case 'dots':
        return (
          <div className="loading-dots">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>
        );
      default:
        return <div className="loading-spinner" />;
    }
  };

  return (
    <div className={`loading-container ${size ? `loading-${size}` : ''}`}>
      {renderLoadingIcon()}
      <div className="loading-text">{text}</div>
      <div className="loading-subtitle">{subtitle}</div>
    </div>
  );
}

export default Loading;