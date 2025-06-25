
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
  containerClassName?: string;
  placeholder?: string; // Added placeholder to props
}

export const Select: React.FC<SelectProps> = ({ label, id, error, options, className, containerClassName, ...props }) => {
  return (
    <div className={`mb-4 ${containerClassName || ''}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        id={id}
        className={`mt-1 block w-full px-3 py-2 bg-white border ${error ? 'border-danger' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${className || ''}`}
        {...props}
      >
        {props.placeholder && <option value="">{props.placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
};
