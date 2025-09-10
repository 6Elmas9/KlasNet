import React, { ReactNode } from 'react';

interface FormLayoutProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function FormLayout({ title, subtitle, icon, children, footer, className = '' }: FormLayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        {(title || subtitle || icon) && (
          <div className="px-6 py-4 border-b bg-gradient-to-r from-teal-50 to-white flex items-center gap-4">
            {icon && <div className="w-12 h-12 flex items-center justify-center rounded bg-teal-100 text-teal-700">{icon}</div>}
            <div>
              {title && <div className="text-xl font-bold text-teal-700">{title}</div>}
              {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
            </div>
          </div>
        )}

        <div className="p-6">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t bg-gray-50">{footer}</div>
        )}
      </div>
    </div>
  );
}
