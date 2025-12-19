import React, { useContext } from 'react';
import ThemeContext from '../context/ThemeContext';

interface OptikkaLogoProps {
  size?: number;
  className?: string;
}

export const OptikkaLogo: React.FC<OptikkaLogoProps> = ({ size = 24, className = '' }) => {
  const { theme } = useContext(ThemeContext);
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 487.95 487.92" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <g>
          <path 
            d="M244.58,97.58c2.66,0,5.3.08,7.93.22L304.42,7.55c-19.33-4.93-39.57-7.55-60.43-7.55C109.25,0,.03,109.23,.03,243.96c0,5.66-.04,11.04-.02,16.81v227.15h28.06s41.96-72.93,41.96-72.93c0,0,0,0,.01.01l52.18-90.7c-15.17-23.06-24.01-50.67-24.01-80.34,0-80.84,65.54-146.38,146.38-146.38Z" 
            fill="#8b5cf6"
          />
          <path 
            d="M242.62,487.91c.46,0,.92,0,1.37,0,134.74,0,243.96-109.23,243.96-243.96,0-69.98-29.47-133.07-76.66-177.56-14.9-13.99-31.57-26.14-49.62-36.06l-12.82,22.3-35.71,62.11c18.52,9.78,34.64,23.46,47.39,39.88,19.07,24.72,30.42,55.7,30.42,89.33,0,80.84-65.54,146.38-146.38,146.38-6.42,0-12.74-.42-18.93-1.22l-56.84,98.8h73.81Z" 
            fill={theme === 'dark' ? '#ffffff' : '#000000'}
          />
        </g>
      </g>
    </svg>
  );
};

export default OptikkaLogo;
