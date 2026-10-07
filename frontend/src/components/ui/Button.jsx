import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md hover:from-brand-700 hover:to-brand-600',
  secondary: 'glass text-brand-700 hover:bg-white/90',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-danger text-white hover:bg-red-700',
  accent: 'bg-accent-500 text-white hover:bg-accent-600',
};
const SIZES = { sm: 'text-sm min-h-[36px] px-3', md: 'text-[15px]', lg: 'text-base min-h-[52px] px-6' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, className = '', children, disabled, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`btn ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : null}
      {children}
    </button>
  );
});
