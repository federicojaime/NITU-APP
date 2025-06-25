
import React from 'react';
import { Advertisement } from '../types';

interface RenderAdvertisementProps {
  advertisement: Advertisement | null;
  className?: string;
}

export const RenderAdvertisement: React.FC<RenderAdvertisementProps> = ({ advertisement, className }) => {
  if (!advertisement || advertisement.status !== 'Active') {
    return null; // Don't render if no ad or ad is inactive
  }

  const adContent = (
    <>
      {advertisement.type === 'image' ? (
        <img src={advertisement.content} alt={advertisement.title} className="max-w-full h-auto object-contain" />
      ) : (
        <p className="text-sm">{advertisement.content}</p>
      )}
    </>
  );

  return (
    <div className={`p-3 my-4 border rounded-lg shadow-sm bg-gray-50 border-gray-200 ${className || ''}`}>
      <h5 className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">{advertisement.title}</h5>
      {advertisement.linkUrl ? (
        <a href={advertisement.linkUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
          {adContent}
        </a>
      ) : (
        <div>{adContent}</div>
      )}
    </div>
  );
};
