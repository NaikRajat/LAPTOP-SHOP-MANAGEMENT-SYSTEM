import React from 'react';
import { Check, X } from 'lucide-react';
import { getPasswordChecks } from '../utils/validation.js';

interface PasswordRequirementsProps {
  password?: string;
  className?: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password = '', className = '' }) => {
  const checks = getPasswordChecks(password);

  const items = [
    { label: 'At least 8 characters', satisfied: checks.minLength },
    { label: 'One uppercase letter (A-Z)', satisfied: checks.hasUpper },
    { label: 'One lowercase letter (a-z)', satisfied: checks.hasLower },
    { label: 'One numerical digit (0-9)', satisfied: checks.hasNumber },
    { label: 'One special character (!@#$%^&*)', satisfied: checks.hasSpecial },
  ];

  return (
    <div className={`mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#262626] text-[11px] ${className}`}>
      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
        <span>Password Requirements:</span>
        <span className="text-[10px] text-slate-400 font-normal">e.g. SysTech@123</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 transition-colors ${
              item.satisfied
                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {item.satisfied ? (
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5" />
              </span>
            ) : (
              <span className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-[#282828] text-slate-400 flex items-center justify-center shrink-0 text-[9px]">
                •
              </span>
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
