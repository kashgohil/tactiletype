import type React from 'react';

export const Terms: React.FC = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2.5">
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
          Terms of Service
        </h1>
        <p className="text-text/50 max-w-2xl leading-relaxed text-[15px]">
          The rules for using TactileType — what we provide, what we ask of you, and where the
          limits are.
        </p>
      </header>

      <div className="space-y-8 text-text/70 max-w-3xl leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing and using TactileType, you accept and agree to be bound by the terms and
            provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            2. Description of Service
          </h2>
          <p>TactileType is a typing test platform that provides:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Real-time typing speed and accuracy testing</li>
            <li>Multiplayer typing competitions</li>
            <li>Performance analytics and progress tracking</li>
            <li>Leaderboards and user profiles</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">3. User Accounts</h2>
          <p>
            To access certain features, you must create an account. You are responsible for
            maintaining the confidentiality of your account credentials and for all activities that
            occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">4. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Use the service for any unlawful purpose</li>
            <li>Interfere with other users' experience</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Share inappropriate or offensive content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            5. Intellectual Property
          </h2>
          <p>
            All content, features, and functionality of TactileType are owned by us and are
            protected by copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">6. Data Privacy</h2>
          <p>
            Your privacy is important to us. We collect and use personal information in accordance
            with our Privacy Policy, which is incorporated into these Terms by reference.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">7. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the service at our sole
            discretion, without prior notice, for conduct that we believe violates these Terms or is
            harmful to other users.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">8. Disclaimer</h2>
          <p>
            The service is provided on an "as is" and "as available" basis. We make no warranties,
            expressed or implied, and hereby disclaim all warranties including, without limitation,
            implied warranties of merchantability and fitness for a particular purpose.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            9. Limitation of Liability
          </h2>
          <p>
            In no event shall TactileType be liable for any indirect, incidental, special,
            consequential, or punitive damages arising out of or relating to your use of the
            service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">10. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            jurisdiction in which TactileType operates, without regard to its conflict of law
            provisions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">
            11. Changes to Terms
          </h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of
            significant changes via email or through the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight text-text mb-3">12. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us through our support
            channels.
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-line">
          <p className="text-sm text-text/45">Last updated: August 28, 2025</p>
        </div>
      </div>
    </div>
  );
};
