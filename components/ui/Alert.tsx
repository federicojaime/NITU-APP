
import React from 'react';

interface AlertProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
}

const typeClasses = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
    text: 'text-emerald-700',
    iconColor: 'text-emerald-500',
    iconPath: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-700',
    iconColor: 'text-red-500',
    iconPath: 'M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm0 4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    text: 'text-amber-700',
    iconColor: 'text-amber-500',
    iconPath: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.216 3.001-1.742 3.001H4.42c-1.526 0-2.493-1.667-1.743-3.001l5.58-9.92zM9 13a1 1 0 112 0v1a1 1 0 11-2 0v-1zm1-4a1 1 0 011 1v3a1 1 0 11-2 0V9a1 1 0 011-1z',
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-400',
    text: 'text-sky-700',
    iconColor: 'text-sky-500',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  }
};

export const Alert: React.FC<AlertProps> = ({ message, type, onClose }) => {
  const classes = typeClasses[type];

  if (!message) return null;

  return (
    <div className={`p-4 mb-4 border-l-4 rounded-md ${classes.bg} ${classes.border} flex items-start`} role="alert">
      <div className="flex-shrink-0">
        <svg className={`h-5 w-5 ${classes.iconColor}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d={classes.iconPath} clipRule="evenodd" />
        </svg>
      </div>
      <div className={`ml-3 ${classes.text}`}>
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onClose && (
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 ${classes.text} hover:bg-opacity-20 hover:bg-current focus:outline-none focus:ring-2 focus:ring-offset-2 ${classes.bg.replace('bg-', 'focus:ring-offset-')} ${classes.iconColor.replace('text-', 'focus:ring-')}`}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
    