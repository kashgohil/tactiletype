import { JsonLd } from '@/components/JsonLd';
import { Panel } from '@/components/ui/panel';
import { SITE_EMAIL, faqPageSchema, webPageSchema } from '@/lib/seo';
import { Bug, Lightbulb, Mail, Users } from 'lucide-react';
import React from 'react';

type Channel = {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
};

const REACH: Channel[] = [
  {
    icon: <Mail className="size-5 text-accent" />,
    title: 'Email support',
    description: 'For general inquiries and support requests',
    href: `mailto:${SITE_EMAIL}`,
    cta: SITE_EMAIL,
  },
];

/**
 * Every category lands in the same inbox. There is one real address, so the
 * categories carry a prefilled subject rather than a per-topic alias — an alias
 * nobody reads is worse than no alias, and mail sent to one bounces silently.
 */
const supportMailto = (subject: string) =>
  `mailto:${SITE_EMAIL}?subject=${encodeURIComponent(subject)}`;

const CATEGORIES: Channel[] = [
  {
    icon: <Bug className="size-5 text-accent" />,
    title: 'Bug reports',
    description: 'Found a bug or experiencing technical issues?',
    href: supportMailto('Bug report'),
    cta: 'Report a bug',
  },
  {
    icon: <Lightbulb className="size-5 text-accent" />,
    title: 'Feature requests',
    description: 'Have ideas to improve tactiletype?',
    href: supportMailto('Feature request'),
    cta: 'Suggest a feature',
  },
  {
    icon: <Users className="size-5 text-accent" />,
    title: 'Business inquiries',
    description: 'Partnership, sponsorship, or business opportunities',
    href: supportMailto('Business inquiry'),
    cta: 'Contact us about business',
  },
  {
    icon: <Mail className="size-5 text-accent" />,
    title: 'Press & media',
    description: 'Media inquiries and press releases',
    href: supportMailto('Press enquiry'),
    cta: 'Press contact',
  },
];

const RESPONSE_TIMES = [
  { label: 'General inquiries', value: 'Within 4 days' },
  { label: 'Bug reports', value: 'Within 2 days' },
  { label: 'Critical issues', value: 'Within 24 hours' },
];

const FAQ = [
  {
    q: 'How do I reset my password?',
    a: 'Visit the login page and click "Forgot Password" to receive a reset link via email.',
  },
  {
    q: 'My typing test results seem inaccurate. What can I do?',
    a: "Make sure you're using a reliable keyboard and that your browser isn't interfering with input detection. Contact support if issues persist.",
  },
  {
    q: 'How do I join multiplayer races?',
    a: 'Navigate to the Multiplayer section from the main menu. You can create or join existing rooms to compete with other typists.',
  },
  {
    q: 'Can I export my typing statistics?',
    a: 'Yes — visit your Analytics page to view and export your detailed typing statistics and progress reports.',
  },
  {
    q: 'Is tactiletype free to use?',
    a: 'Yes, tactiletype is completely free to use. We may offer premium features in the future, but the core functionality will always remain free.',
  },
];

/** A borderless row — panels never nest, so channels separate by spacing only. */
function ChannelRow({ icon, title, description, href, cta }: Channel) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-9 rounded-lg bg-accent/[0.06] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-text/50 mt-1 leading-relaxed">
          {description}
        </p>
        <a
          href={href}
          className="inline-block text-sm text-accent mt-1.5 underline-offset-2 hover:underline break-all"
        >
          {cta}
        </a>
      </div>
    </div>
  );
}

export const Contact: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* FAQPage markup is safe here only because the same questions and
          answers render visibly below — Google treats FAQ schema that doesn't
          match the page as a manual-action offence. */}
      <JsonLd
        id="content"
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            webPageSchema({
              path: '/contact',
              title: 'Contact & Support | tactiletype',
              description:
                'Get help with tactiletype: support email, bug reports, feature ideas, and FAQs.',
            }),
            faqPageSchema(FAQ, '/contact'),
          ],
        }}
      />

      <header className="space-y-2.5">
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
          Contact & support
        </h1>
        <p className="text-text/50 max-w-2xl leading-relaxed text-[15px]">
          Questions about tactiletype, a bug to report, or an idea worth
          building — pick the channel that fits and we'll get back to you.
        </p>
      </header>

      <Panel
        title="Get in touch"
        description="For anything that doesn't fit a category below."
      >
        <div className="grid md:grid-cols-2 gap-6">
          {REACH.map((channel) => (
            <ChannelRow key={channel.title} {...channel} />
          ))}
        </div>
      </Panel>

      <Panel title="Support categories">
        <div className="grid md:grid-cols-2 gap-6">
          {CATEGORIES.map((channel) => (
            <ChannelRow key={channel.title} {...channel} />
          ))}
        </div>
      </Panel>

      <Panel title="Response times" tone="accent">
        <div className="grid sm:grid-cols-3 gap-4">
          {RESPONSE_TIMES.map((row) => (
            <div key={row.label}>
              <p className="text-sm text-text/50">{row.label}</p>
              <p className="font-semibold tracking-tight mt-0.5">{row.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Frequently asked questions">
        <div className="divide-y divide-line">
          {FAQ.map((item) => (
            <div key={item.q} className="py-4 first:pt-0 last:pb-0">
              <h3 className="font-medium tracking-tight">{item.q}</h3>
              <p className="text-sm text-text/50 mt-1.5 leading-relaxed max-w-2xl">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
};
