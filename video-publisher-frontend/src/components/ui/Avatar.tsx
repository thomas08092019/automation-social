import React from 'react';
import './Avatar.css';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  fallbackText?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'medium',
  className = '',
  fallbackText
}) => {
  const [imageError, setImageError] = React.useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };

  const getFallbackInitials = (text: string) => {
    if (!text) return '?';
    
    const words = text.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const showFallback = !src || imageError;

  return (
    <div className={`avatar avatar-${size} ${className}`}>
      {showFallback ? (
        <div className="avatar-fallback">
          {getFallbackInitials(fallbackText || alt)}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="avatar-image"
          onError={handleImageError}
        />
      )}
    </div>
  );
};
