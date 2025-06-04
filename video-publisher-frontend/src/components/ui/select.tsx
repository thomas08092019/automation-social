import React, { useState, useRef, useEffect } from 'react';

export interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export interface SelectContentProps {
  children: React.ReactNode;
}

export interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  onSelect?: (value: string) => void;
  className?: string;
}

export interface SelectValueProps {
  placeholder?: string;
}

const SelectContext = React.createContext<{
  isOpen: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  onToggle: () => void;
  disabled?: boolean;
}>({
  isOpen: false,
  onToggle: () => {},
  disabled: false,
});

export const Select: React.FC<SelectProps> = ({ children, value, onValueChange, className = '', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <SelectContext.Provider value={{ isOpen, value, onValueChange, onToggle, disabled }}>
      <div ref={selectRef} className={`relative ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, className = '', ...props }) => {
  const { onToggle, disabled } = React.useContext(SelectContext);
  
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  const { isOpen } = React.useContext(SelectContext);
  
  if (!isOpen) return null;
  
  return (
    <div className="absolute z-50 w-full mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
      {children}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ children, value, className = '', onSelect, ...props }) => {
  const { onValueChange, onToggle } = React.useContext(SelectContext);
  
  const handleClick = () => {
    if (onValueChange) onValueChange(value);
    if (onSelect) onSelect(value);
    onToggle(); // Close after selection
  };
  
  return (
    <div
      onClick={handleClick}
      className={`relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext);
  
  return (
    <span className={value ? "text-gray-900" : "text-gray-500"}>
      {value || placeholder}
    </span>
  );
};
