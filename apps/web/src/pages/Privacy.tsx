import type React from 'react';
import { SITE_EMAIL } from '@/lib/seo';

export const Privacy: React.FC = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2.5">
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
          Privacy Policy
        </h1>
        <p className="text-text/50 max-w-2xl leading-relaxed text-[15px]">
          What we collect when you type, why we keep it, and how to get it back or get rid of it.
        </p>
      </header>

      <div className="space-y-8 text-text/70 max-w-3xl leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            1. Information We Collect
          </h2>
          <p className="mb-4">
            We collect information you provide directly to us and information we obtain
            automatically when you use TactileType.
          </p>

          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text/45 mb-2">
            Information You Provide:
          </h3>
          <ul className="list-disc list-inside mt-2 space-y-1 mb-4">
            <li>Account information (username, email address)</li>
            <li>Profile information and preferences</li>
            <li>Communications you send to us</li>
          </ul>

          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text/45 mb-2">
            Information We Collect Automatically:
          </h3>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Typing test results and performance metrics</li>
            <li>Usage data and interaction patterns</li>
            <li>Device information and browser data</li>
            <li>IP address and location information</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            2. How We Use Your Information
          </h2>
          <p className="mb-4">We use the information we collect to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Provide and improve our typing test services</li>
            <li>Track your progress and generate analytics</li>
            <li>Enable multiplayer competitions and leaderboards</li>
            <li>Send you updates and respond to your requests</li>
            <li>Ensure platform security and prevent abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            3. Information Sharing
          </h2>
          <p className="mb-4">
            We do not sell, trade, or otherwise transfer your personal information to third parties,
            except in the following circumstances:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>With your explicit consent</li>
            <li>To comply with legal requirements</li>
            <li>To protect our rights and prevent fraud</li>
            <li>In connection with a business transfer or acquisition</li>
            <li>Anonymous, aggregated data for analytics and improvements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            information against unauthorized access, alteration, disclosure, or destruction.
            However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">5. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to provide our services and
            fulfill the purposes outlined in this policy. You can request deletion of your account
            and associated data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">6. Your Rights</h2>
          <p className="mb-4">
            Depending on your location, you may have the following rights regarding your personal
            information:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Access to your personal data</li>
            <li>Correction of inaccurate data</li>
            <li>Deletion of your data</li>
            <li>Data portability</li>
            <li>Opt-out of certain data processing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            7. Cookies and Tracking
          </h2>
          <p>
            We use cookies and similar technologies to enhance your experience, analyze usage
            patterns, and remember your preferences. You can control cookie settings through your
            browser preferences.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            8. Third-Party Services
          </h2>
          <p>
            Our service may contain links to third-party websites or integrate with third-party
            services. We are not responsible for the privacy practices of these external services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            9. Children's Privacy
          </h2>
          <p>
            TactileType is not intended for children under 13. We do not knowingly collect personal
            information from children under 13. If we become aware that we have collected such
            information, we will delete it immediately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            10. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material
            changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, email us at{' '}
            <a
              href={`mailto:${SITE_EMAIL}`}
              className="text-accent underline-offset-2 hover:underline"
            >
              {SITE_EMAIL}
            </a>
            .
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-line">
          <p className="text-sm text-text/45">Last updated: August 28, 2025</p>
        </div>
      </div>
    </div>
  );
};
