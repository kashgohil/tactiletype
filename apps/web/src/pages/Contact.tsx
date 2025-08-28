import { Bug, Lightbulb, Mail, MessageCircle, Users } from 'lucide-react';
import React from 'react';

export const Contact: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Contact & Support</h1>

      <div className="space-y-8">
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            We're here to help! Whether you have questions about tactiletype,
            need technical support, or want to share feedback, don't hesitate to
            reach out.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <Mail className="text-accent mt-1" size={24} />
              <div>
                <h3 className="text-lg font-semibold mb-2">Email Support</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  For general inquiries and support requests
                </p>
                <a
                  href="mailto:support@tactiletype.com"
                  className="text-accent underline"
                >
                  support@tactiletype.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <MessageCircle className="text-accent mt-1" size={24} />
              <div>
                <h3 className="text-lg font-semibold mb-2">Community Chat</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Join our Discord community for real-time discussions
                </p>
                <a
                  href="https://discord.gg/tactiletype"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  Join Discord Server
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Support Categories</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <Bug className="text-accent mt-1" size={24} />
              <div>
                <h3 className="text-lg font-semibold mb-2">Bug Reports</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Found a bug or experiencing technical issues?
                </p>
                <a
                  href="mailto:bugs@tactiletype.com"
                  className="text-accent underline"
                >
                  Report a Bug
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Lightbulb className="text-accent mt-1" size={24} />
              <div>
                <h3 className="text-lg font-semibold mb-2">Feature Requests</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Have ideas to improve tactiletype?
                </p>
                <a
                  href="mailto:features@tactiletype.com"
                  className="text-accent underline"
                >
                  Suggest a Feature
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Users className="text-accent mt-1" size={24} />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Business Inquiries
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Partnership, sponsorship, or business opportunities
                </p>
                <a
                  href="mailto:business@tactiletype.com"
                  className="text-accent underline"
                >
                  Contact Business Team
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Mail className="text-accent mt-1" size={24} />
              <div>
                <h3 className="text-lg font-semibold mb-2">Press & Media</h3>
                <p className="text-gray-600 mb-2">
                  Media inquiries and press releases
                </p>
                <a
                  href="mailto:press@tactiletype.com"
                  className="text-accent underline"
                >
                  Press Contact
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-accent/30 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Response Times</h2>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <h3 className="font-semibold">General Inquiries</h3>
              <p className="text-gray-600 dark:text-gray-300">Within 4 days</p>
            </div>
            <div>
              <h3 className="font-semibold">Bug Reports</h3>
              <p className="text-gray-600 dark:text-gray-300">Within 2 days</p>
            </div>
            <div>
              <h3 className="font-semibold">Critical Issues</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Within 24 hours
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-md mb-10">
          <h2 className="text-2xl font-semibold mb-4">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-lg font-medium mb-2">
                How do I reset my password?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Visit the login page and click "Forgot Password" to receive a
                reset link via email.
              </p>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-lg font-medium mb-2">
                My typing test results seem inaccurate. What can I do?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Make sure you're using a reliable keyboard and that your browser
                isn't interfering with input detection. Contact support if
                issues persist.
              </p>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-lg font-medium mb-2">
                How do I join multiplayer races?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Navigate to the Multiplayer section from the main menu. You can
                create or join existing rooms to compete with other typists.
              </p>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-lg font-medium mb-2">
                Can I export my typing statistics?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes! Visit your Analytics page to view and export your detailed
                typing statistics and progress reports.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">
                Is tactiletype free to use?
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Yes, tactiletype is completely free to use. We may offer premium
                features in the future, but the core functionality will always
                remain free.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
