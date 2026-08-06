import { TypingPreferencesSection } from '@/components/test/TypingPreferencesSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
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

const labelClass = 'text-text/60 mb-1.5';

function PageHeader() {
  return (
    <header className="space-y-2.5">
      <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
        Settings
      </h1>
      <p className="text-text/50 max-w-2xl leading-relaxed text-[15px]">
        How the test screen behaves on this device, and what the rest of the
        world sees on your profile.
      </p>
    </header>
  );
}

/** Label/value row for read-only account facts. */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <span className="text-sm text-text/50">{label}</span>
      <span className="text-sm font-medium break-all">{value}</span>
    </div>
  );
}

export const Settings: React.FC = () => {
  const { user, logout, logoutEverywhere } = useAuth();
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
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const [message, setMessage] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

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

  // Typing preferences are device-local, so guests get them too — only the
  // account/profile sections need a login.
  if (!user) {
    return (
      <div className="space-y-8">
        <PageHeader />

        <div className="grid lg:grid-cols-2 gap-4">
          <TypingPreferencesSection />
          <Panel
            title="Profile & account"
            description="Log in to edit your display name, bio, and account details. Preferences stay on this device either way."
          >
            <Button asChild>
              <Link to="/login">Log in</Link>
            </Button>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader />

      <div className="grid lg:grid-cols-2 gap-4">
        <TypingPreferencesSection />

        <Panel
          title="Public profile"
          description={`Shown to anyone at /u/${user.username}. Your email stays private.`}
        >
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-20 w-full" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-9 w-full" />
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
                <Label className={labelClass} htmlFor="set-display-name">
                  Display name
                </Label>
                <Input
                  id="set-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user.username}
                  maxLength={100}
                />
              </div>

              <div>
                <Label className={labelClass} htmlFor="set-bio">
                  Bio
                </Label>
                <Textarea
                  id="set-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short note about your typing journey"
                  maxLength={500}
                  rows={3}
                  className="resize-y min-h-20"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className={labelClass} htmlFor="set-country">
                    Country
                  </Label>
                  <Input
                    id="set-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value.slice(0, 2))}
                    placeholder="US"
                    maxLength={2}
                    className="uppercase"
                  />
                </div>
                <div>
                  <Label className={labelClass} htmlFor="set-keyboard">
                    Keyboard
                  </Label>
                  <Select value={keyboard} onValueChange={setKeyboard}>
                    <SelectTrigger id="set-keyboard" className="w-full">
                      <SelectValue placeholder="Keyboard layout" />
                    </SelectTrigger>
                    <SelectContent>
                      {KEYBOARD_OPTIONS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={labelClass} htmlFor="set-language">
                    Language
                  </Label>
                  <Input
                    id="set-language"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    placeholder="en"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Switch
                  id="set-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="set-public" className="cursor-pointer">
                  Make my profile public
                  <span className="text-text/40">/u/{user.username}</span>
                </Label>
              </div>

              <div className="flex items-center gap-3 flex-wrap pt-1">
                <Button type="submit" disabled={mutation.isPending}>
                  <Save className="size-4" />
                  {mutation.isPending ? 'Saving…' : 'Save profile'}
                </Button>
                {message && (
                  <p
                    className={`text-sm ${
                      message.type === 'ok' ? 'text-accent' : 'text-destructive'
                    }`}
                  >
                    {message.text}
                  </p>
                )}
              </div>
            </form>
          )}
        </Panel>

        <Panel
          title="Account"
          description="Private to you. Password and OAuth connections land here later."
        >
          <div className="divide-y divide-accent/10 -my-3">
            <InfoRow label="Username" value={`@${user.username}`} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow
              label="Member since"
              value={new Date(user.createdAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
          </div>
        </Panel>

        <Panel
          title={<span className="text-destructive">Session</span>}
          description="You stay signed in as long as you keep coming back. After a month away, you'll be asked to log in again."
          className="border-destructive/50"
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                logout();
                window.location.href = '/';
              }}
            >
              Log out
            </Button>
            <Button
              variant="outline"
              disabled={signingOutEverywhere}
              onClick={async () => {
                setSigningOutEverywhere(true);
                try {
                  await logoutEverywhere();
                  window.location.href = '/';
                } catch {
                  setSigningOutEverywhere(false);
                  toast.error('Could not sign out other devices');
                }
              }}
            >
              {signingOutEverywhere ? 'Signing out…' : 'Log out on all devices'}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
};
