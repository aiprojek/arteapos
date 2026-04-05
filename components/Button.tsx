
import React from 'react';

// FIX: Add size prop to ButtonProps
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'utility' | 'operational';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

// FIX: Update component to handle the new size prop
const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', children, className, ...props }) => {
  const baseClasses = 'rounded-xl font-semibold leading-tight transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

  const variantClasses = {
    primary: 'bg-[#347758] text-white hover:bg-[#2a6046] focus:ring-[#347758]',
    secondary: 'bg-slate-600 text-slate-100 hover:bg-slate-700 focus:ring-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    utility: 'bg-slate-700 text-slate-100 border border-slate-600 hover:bg-slate-600 focus:ring-slate-500',
    operational: 'bg-slate-800/80 text-slate-100 border border-slate-700/70 hover:bg-slate-700 focus:ring-slate-500',
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
