import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | MathSolver",
  description: "Terms of Service for MathSolver. Please read these terms carefully before using our services.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsOfServicePage() {
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

        <h1 className="text-3xl font-bold tracking-tight mb-8">Terms of Service</h1>
        
        <div className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground">
          <p className="mb-6">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          
          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Agreement to Terms</h2>
          <p className="mb-4">
            By accessing or using MathSolver (the "Service") at math-solver.io, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Use of the Service</h2>
          <p className="mb-4">
            MathSolver provides an AI-powered mathematical educational tool. You agree to use the Service only for lawful purposes and in a way that does not infringe the rights of, restrict, or inhibit anyone else&apos;s use and enjoyment of the Service.
          </p>
          <p className="mb-4">You specifically agree not to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-2">
            <li>Use the service to engage in automated scraping, data mining, or data extraction.</li>
            <li>Attempt to reverse engineer the AI models or algorithms powering the service.</li>
            <li>Use the service to generate answers for standardized tests, examinations, or any scenario where strictly prohibited by an academic institution&apos;s honor code. The service is intended as a learning aid and homework helper.</li>
            <li>Overwhelm our servers with an unreasonable number of excessive requests.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Accuracy of Solutions</h2>
          <p className="mb-4">
            While we strive to provide the most accurate step-by-step math solutions possible using advanced AI, <strong>MathSolver can make mistakes</strong>. You must double-check important steps and calculations. We do not guarantee that any solution provided by our tools is entirely accurate, complete, or error-free. We shall not be held liable for any academic, professional, or personal consequences resulting from reliance on the answers provided by this Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Intellectual Property Rights</h2>
          <p className="mb-4">
            The Service and its original content, features, functionality, and design are and will remain the exclusive property of MathSolver and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
          </p>
          <p className="mb-4">
            By submitting questions, mathematical equations, or images of problems to us, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and process that content solely for the purpose of providing you with a solution and improving our AI models.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Third-Party Links and APIs</h2>
          <p className="mb-4">
            Our Service may contain links to third-party web sites or services that are not owned or controlled by us. We use external AI APIs to process requests. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party APIs or web sites.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Termination</h2>
          <p className="mb-4">
            We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Limitation of Liability</h2>
          <p className="mb-4">
            In no event shall MathSolver, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about these Terms, please contact us at support@math-solver.io.
          </p>
        </div>
      </div>
    </div>
  );
}
