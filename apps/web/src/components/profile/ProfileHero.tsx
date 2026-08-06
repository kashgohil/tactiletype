import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Link } from '@tanstack/react-router';
import type { User, UserProfile } from '@tactile/types';
import { Globe, Keyboard, Lock, Mail, Settings, Share2 } from 'lucide-react';
import React from 'react';

interface ProfileHeroProps {
  user: User;
  profile?: UserProfile | null;
  onShare?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function countryFlag(code?: string | null): string | null {
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...[...upper].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  );
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  user,
  profile,
  onShare,
}) => {
  const displayName = profile?.displayName || user.username;
  const initials = getInitials(displayName);
  const flag = countryFlag(profile?.country);
  const isPublic = profile?.isPublic !== false;

  return (
    <Panel className="p-6 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div
          className="shrink-0 size-20 md:size-24 rounded-full bg-accent/30 border-2 border-accent/30 flex items-center justify-center text-2xl md:text-3xl font-semibold text-accent overflow-hidden"
          aria-hidden
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold truncate">
              {displayName}
            </h1>
            {flag && (
              <span className="text-xl" title={profile?.country ?? undefined}>
                {flag}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/20 text-text/70"
              title={isPublic ? 'Profile is public' : 'Profile is private'}
            >
              {isPublic ? (
                <>
                  <Globe className="size-3" /> Public
                </>
              ) : (
                <>
                  <Lock className="size-3" /> Private
                </>
              )}
            </span>
          </div>

          <p className="text-text/50 text-sm">@{user.username}</p>

          {profile?.bio && (
            <p className="text-text/80 text-sm md:text-base max-w-xl leading-relaxed">
              {profile.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-sm text-text/50 pt-1">
            {profile?.keyboard && (
              <span className="inline-flex items-center gap-1.5">
                <Keyboard className="size-3.5" />
                {profile.keyboard}
              </span>
            )}
            {user.email && (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </span>
            )}
            <span>
              Member since{' '}
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch w-full sm:w-auto">
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings">
              <Settings className="size-4" />
              Edit profile
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/u/$username" params={{ username: user.username }}>
              <Globe className="size-4" />
              Public page
            </Link>
          </Button>
          {onShare && (
            <Button variant="ghost" size="sm" onClick={onShare}>
              <Share2 className="size-4" />
              Share
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
};
