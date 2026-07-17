import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts';
import { usersApi } from '../services/api';

const KEYBOARD_OPTIONS = [
  'QWERTY',
  'Colemak',
  'Dvorak',
  'Workman',
  'AZERTY',
  'Other',
];

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => usersApi.getProfile(),
    enabled: !!user,
  });

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [keyboard, setKeyboard] = useState('QWERTY');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [isPublic, setIsPublic] = useState(true);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  useEffect(() => {
    const p = data?.profile;
    if (p) {
      setDisplayName(p.displayName ?? '');
      setBio(p.bio ?? '');
      setCountry(p.country ?? '');
      setKeyboard(p.keyboard ?? 'QWERTY');
      setPreferredLanguage(p.preferredLanguage ?? 'en');
      setIsPublic(p.isPublic !== false);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => {
      const countryCode = country.trim().toUpperCase();
      if (countryCode && countryCode.length !== 2) {
        throw new Error('Country must be a 2-letter ISO code (e.g. US).');
      }
      return usersApi.updateProfile({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        country: countryCode || undefined,
        keyboard: keyboard || undefined,
        preferredLanguage,
        isPublic,
      });
    },
    onSuccess: () => {
      setMessage({ type: 'ok', text: 'Profile saved.' });
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
    },
    onError: (err: Error) => {
      setMessage({
        type: 'err',
        text: err.message || 'Failed to save profile.',
      });
    },
  });

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-text/50 mb-4">Please log in to edit settings.</p>
        <Button asChild>
          <Link to="/login">Log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-2 pb-10 max-w-xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/profile" aria-label="Back to profile">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-text/50">
            Private account details and profile fields
          </p>
        </div>
      </div>

      {/* Public-facing profile fields */}
      <section className="bg-accent/10 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">Public profile</h2>
        <p className="text-xs text-text/40 -mt-2">
          Shown on your profile. Account email stays private.
        </p>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage(null);
              mutation.mutate();
            }}
          >
            <div>
              <label className="block text-sm font-medium text-text/60 mb-1.5">
                Display name
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user.username}
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text/60 mb-1.5">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short note about your typing journey"
                maxLength={500}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text/60 mb-1.5">
                  Country (ISO)
                </label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value.slice(0, 2))}
                  placeholder="US"
                  maxLength={2}
                  className="uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text/60 mb-1.5">
                  Keyboard
                </label>
                <select
                  value={keyboard}
                  onChange={(e) => setKeyboard(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {KEYBOARD_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text/60 mb-1.5">
                Preferred language
              </label>
              <Input
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                placeholder="en"
                maxLength={10}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="size-4 accent-[var(--color-accent)]"
              />
              <span className="text-sm">
                Public profile{' '}
                <span className="text-text/40">
                  (shareable at /u/{user.username})
                </span>
              </span>
            </label>

            {message && (
              <p
                className={`text-sm ${
                  message.type === 'ok' ? 'text-accent' : 'text-destructive'
                }`}
              >
                {message.text}
              </p>
            )}

            <Button type="submit" disabled={mutation.isPending}>
              <Save className="size-4" />
              {mutation.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        )}
      </section>

      {/* Private account info */}
      <section className="bg-accent/10 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">Account</h2>
        <div>
          <label className="block text-sm font-medium text-text/50">
            Username
          </label>
          <p className="text-lg">@{user.username}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-text/50">Email</label>
          <p className="text-lg break-all">{user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-text/50">
            Member since
          </label>
          <p className="text-lg">
            {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
        <p className="text-xs text-text/40">
          Password and OAuth connections management will live here later.
        </p>
      </section>

      <section className="border border-destructive/30 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-lg text-destructive">
          Session
        </h2>
        <Button
          variant="destructive"
          onClick={() => {
            logout();
            window.location.href = '/';
          }}
        >
          Log out
        </Button>
      </section>
    </div>
  );
};
