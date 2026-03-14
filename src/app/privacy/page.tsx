import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | MathSolver",
  description: "Privacy Policy for MathSolver. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-8">Privacy Policy</h1>
        
        <div className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground">
          <p className="mb-6">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          
          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Introduction</h2>
          <p className="mb-4">
            Welcome to MathSolver ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website at math-solver.io and use our AI math solver services.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Information We Collect</h2>
          <p className="mb-4">We collect information that you manually provide to us, such as:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li><strong>Input Data:</strong> The text, equations, and images of math problems you upload or type into our solver for the purpose of receiving step-by-step solutions.</li>
            <li><strong>Usage Data:</strong> Information about how you use our website, including pages visited, features used, and time spent on the site. We use standard analytics tools to collect this data.</li>
            <li><strong>Device Data:</strong> We may automatically collect device information, such as your IP address, browser type, operating system, and geographic location (at the city or country level).</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. How We Use Your Information</h2>
          <p className="mb-4">We use the collected data for the following purposes:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>To provide, maintain, and improve our AI math solving services.</li>
            <li>To process and analyze the math problems you submit to generate accurate step-by-step solutions.</li>
            <li>To train and improve the underlying artificial intelligence models powering our solver (input data may be anonymized for this purpose).</li>
            <li>To analyze usage patterns to enhance user experience and optimize our website infrastructure.</li>
            <li>To respond to your inquiries or support requests.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Cookies and Tracking Technologies</h2>
          <p className="mb-4">
            We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Third-Party Services</h2>
          <p className="mb-4">
            We may share your information with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf. This includes our AI API providers (such as OpenAI, Anthropic, or similar services) necessary to process your queries, and analytics providers.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Data Security</h2>
          <p className="mb-4">
            We implement appropriate technical and organizational security measures to protect the integrity and confidentiality of your personal information. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Children&apos;s Privacy</h2>
          <p className="mb-4">
            Our services are broadly intended for educational purposes. We do not knowingly collect personally identifiable information from children under 13 without verifying parental consent. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Changes to This Privacy Policy</h2>
          <p className="mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us via the contact form on our website or email us at support@math-solver.io.
          </p>
        </div>
      </div>
    </div>
  );
}
