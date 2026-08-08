import { Link } from '@tanstack/react-router';
import { useAuth } from '@/contexts';
import type { FileRoutesByTo } from '@/routeTree.gen';

type AppPath = keyof FileRoutesByTo;
/** `params` is for templated routes like `/guides/$slug`. */
type FooterLink = {
  to: AppPath;
  label: string;
  hint?: string;
  params?: Record<string, string>;
};

const TRAIN: FooterLink[] = [
  { to: '/', label: 'Typing test' },
  { to: '/practice', label: 'Practice drills' },
  { to: '/play', label: 'Play modes' },
  { to: '/daily', label: 'Daily challenge' },
];

const COMPETE: FooterLink[] = [
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/multiplayer', label: 'Multiplayer' },
];

/**
 * The only sitewide link into the content cluster. Guides that nothing links to
 * are crawled late and ranked worse - descriptive anchor text here is what
 * carries them, which is also why these say "How to improve typing speed"
 * rather than "Read more".
 */
const LEARN: FooterLink[] = [
  { to: '/typing-test', label: 'What a typing test measures' },
  { to: '/guides/$slug', params: { slug: 'what-is-wpm' }, label: 'What is WPM?' },
  {
    to: '/guides/$slug',
    params: { slug: 'how-to-improve-typing-speed' },
    label: 'Improve typing speed',
  },
  { to: '/guides', label: 'All guides' },
];

const LEGAL: FooterLink[] = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/contact', label: 'Contact' },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-text/40 font-semibold mb-3">
        {title}
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
          // Key on the label: templated routes repeat the same `to`.
          <li key={link.label}>
            <Link
              to={link.to}
              params={link.params}
              className="text-sm text-text/60 hover:text-accent transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Sits in the normal flow. `mt-auto` inside the root flex column pins it to the
 * bottom when the page is short, and lets it scroll away when the page is tall.
 */
export function Footer() {
  const { user } = useAuth();

  const account: FooterLink[] = user
    ? [
        { to: '/profile', label: 'Profile' },
        { to: '/analytics', label: 'Analytics' },
        { to: '/settings', label: 'Settings' },
      ]
    : [
        { to: '/login', label: 'Log in' },
        { to: '/register', label: 'Create account' },
        { to: '/settings', label: 'Settings' },
      ];

  return (
    <footer
      data-theme-surface
      className="w-full shrink-0 mt-auto bg-surface-accent border-t border-line"
    >
      <div className="w-full max-w-shell mx-auto px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-x-6 gap-y-10">
          {/* Brand block gets the wide column; links fill the rest. */}
          <div className="col-span-2 md:pr-8">
            <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold">
              <img src="/tactiletype-256x256.png" alt="" height={28} width={28} />
              tactiletype
            </Link>
            <p className="text-sm text-text/50 mt-3 leading-relaxed max-w-xs">
              A typing trainer that measures what you actually type - real drills, honest numbers,
              and modes that train more than raw speed.
            </p>
          </div>

          <FooterColumn title="Train" links={TRAIN} />
          <FooterColumn title="Compete" links={COMPETE} />
          <FooterColumn title="Learn" links={LEARN} />
          <FooterColumn title="Account" links={account} />
        </div>

        <div className="mt-10 pt-6 border-t border-line flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="text-sm text-text/45">
            &copy; {new Date().getFullYear()} tactiletype. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGAL.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-text/45 hover:text-accent transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
