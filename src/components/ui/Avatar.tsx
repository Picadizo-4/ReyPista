// src/components/ui/Avatar.tsx
interface AvatarProps {
  url: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = ({ url, name, size = 'md' }: AvatarProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl'
  };

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div 
      className={`shrink-0 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-200 font-bold text-blue-700 ${sizeClasses[size]}`}
    >
      {url ? (
        <img 
          src={url} 
          alt={`Avatar de ${name}`} 
          className="w-full h-full object-cover" 
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};