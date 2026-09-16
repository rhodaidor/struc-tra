import React, { useState, useEffect } from 'react';

interface UserAvatarProps {
  name?: string | null;
  avatar?: string | null;
  className?: string;
  textClassName?: string;
}

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string' || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'U';
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatar,
  className = 'w-8 h-8 text-xs',
  textClassName = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);

  useEffect(() => {
    setImageError(false);
  }, [avatar]);

  if (avatar && avatar.trim() !== '' && !imageError) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImageError(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0 tracking-wider shadow-2xs select-none ${className}`}
      aria-label={name}
    >
      <span className={textClassName}>{initials}</span>
    </div>
  );
};
