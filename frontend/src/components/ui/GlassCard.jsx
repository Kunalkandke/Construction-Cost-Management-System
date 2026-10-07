export function GlassCard({ strong = false, padding = 'p-5 sm:p-6', hoverLift = false, className = '', as: Tag = 'div', children, ...rest }) {
  return (
    <Tag className={`${strong ? 'glass-strong' : 'glass'} ${padding} ${hoverLift ? 'transition hover:-translate-y-0.5 hover:shadow-xl' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
