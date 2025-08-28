import React from 'react';

export const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        Terms of Service
      </h1>

      <div className="space-y-8 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing and using TactileType, you accept and agree to be bound
            by the terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
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
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            3. User Accounts
          </h2>
          <p>
            To access certain features, you must create an account. You are
            responsible for maintaining the confidentiality of your account
            credentials and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            4. User Conduct
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Use the service for any unlawful purpose</li>
            <li>Interfere with other users' experience</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Share inappropriate or offensive content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            5. Intellectual Property
          </h2>
          <p>
            All content, features, and functionality of TactileType are owned by
            us and are protected by copyright, trademark, and other intellectual
            property laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            6. Data Privacy
          </h2>
          <p>
            Your privacy is important to us. We collect and use personal
            information in accordance with our Privacy Policy, which is
            incorporated into these Terms by reference.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            7. Termination
          </h2>
          <p>
            We may terminate or suspend your account and access to the service
            at our sole discretion, without prior notice, for conduct that we
            believe violates these Terms or is harmful to other users.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            8. Disclaimer
          </h2>
          <p>
            The service is provided on an "as is" and "as available" basis. We
            make no warranties, expressed or implied, and hereby disclaim all
            warranties including, without limitation, implied warranties of
            merchantability and fitness for a particular purpose.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            9. Limitation of Liability
          </h2>
          <p>
            In no event shall TactileType be liable for any indirect,
            incidental, special, consequential, or punitive damages arising out
            of or relating to your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            10. Governing Law
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the jurisdiction in which TactileType operates, without
            regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            11. Changes to Terms
          </h2>
          <p>
            We reserve the right to modify these Terms at any time. We will
            notify users of significant changes via email or through the
            service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            12. Contact Us
          </h2>
          <p>
            If you have any questions about these Terms, please contact us
            through our support channels.
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: August 28, 2025
          </p>
        </div>
      </div>
    </div>
  );
};
