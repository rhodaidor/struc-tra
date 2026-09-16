import React from 'react';
import { ShieldCheck, CheckCircle2, Lock, Scale } from 'lucide-react';

export const TermsOfServiceContent: React.FC = () => {
  return (
    <div className="space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
      <div className="p-3.5 sm:p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs leading-normal">
          By accessing or registering an account on Structra, you agree to these Terms of Service. Please read them carefully before using our document intelligence platform.
        </p>
      </div>

      <section className="space-y-2">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          1. Agreement to Terms
        </h4>
        <p>
          These Terms of Service constitute a legally binding agreement between you (whether personally or on behalf of an entity) and Structra Technologies Inc. concerning your access to and use of the Structra web application and document processing services.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          2. User Accounts & Responsibilities
        </h4>
        <p>
          You are responsible for maintaining the confidentiality of your account login credentials, connected OAuth integrations (e.g. Gmail, Telegram, Google Drive), and any activity under your account. You agree to notify us immediately of any unauthorized access.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          3. Acceptable Use Policy
        </h4>
        <p>
          You agree not to upload, store, or process any documents containing malicious software, unauthorized personal data of third parties, or illegal material. Structra reserves the right to suspend accounts that violate platform security boundaries.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          4. Data Ownership & Intellectual Property
        </h4>
        <p>
          You retain complete ownership rights over all documents, files, contracts, and metadata uploaded or indexed in your Structra workspace. Structra claims no ownership over your business documents.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          5. Service Availability & Support
        </h4>
        <p>
          Structra provides high-availability document retrieval services backed by distributed cloud infrastructure and automated backups. Standard technical support is available to all registered users.
        </p>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          6. Account Termination & Deletion
        </h4>
        <p>
          You may delete your Structra account at any time. Upon account deletion, all indexed document embeddings, cached metadata, and connected OAuth sessions are permanently purged from our database.
        </p>
      </section>
    </div>
  );
};

export const PrivacyPolicyContent: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
      {/* Overview Banner */}
      <div className="p-3.5 sm:p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
        <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-xs leading-normal">
          Your privacy and document security are fundamental to our architecture. Structra uses layered security controls, infrastructure-level encryption at rest, encrypted network transit, and strict Google Limited Use compliance. We do not sell user data, nor do we use your private documents to train generalized AI models.
        </p>
      </div>

      {/* 1. Information We Access & Collect */}
      <section className="space-y-3">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          1. Information We Access & Collect
        </h4>
        <p>
          We collect account registration information (email address, full name, and workspace preferences) to authenticate your access and operate your personal Structra workspace.
        </p>
        <div className="space-y-2 pt-1">
          <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Gmail Integration & Google User Data
          </h5>
          <p>
            When you connect your Gmail account, Structra requests read-only OAuth access via the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] sm:text-xs text-blue-600 dark:text-blue-400">https://www.googleapis.com/auth/gmail.readonly</code> scope. This access is strictly used to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Identify eligible Gmail messages containing supported business document attachments;</li>
            <li>Inspect relevant message and attachment metadata;</li>
            <li>Retrieve eligible document attachments;</li>
            <li>Process and index those documents; and</li>
            <li>Make them searchable and retrievable within your Structra account.</li>
          </ul>
          <p>
            <strong>Strict Read-Only Boundaries:</strong> Structra does not request permission to send Gmail messages, modify Gmail messages, delete Gmail messages, archive Gmail messages, or label Gmail messages.
          </p>
          <p>
            <strong>Categories of Gmail Data Accessed:</strong> The specific categories of Gmail information accessed include your Gmail account email address, message IDs, thread IDs, timestamps, email headers (Subject, From, Date), MIME message structure, attachment filenames, attachment MIME types, attachment IDs, attachment file sizes, and eligible attachment binary content.
          </p>
          <p>
            <strong>Email Body Content Excluded:</strong> Ordinary Gmail email-body content (<code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">text/plain</code> or <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">text/html</code>) is not intentionally imported or indexed by Structra's document-ingestion pipeline. Inline and CID images (such as email signatures, logos, or tracking pixels) are systematically excluded from ingestion.
          </p>
        </div>
      </section>

      {/* 2. Storage Modes */}
      <section className="space-y-3">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          2. Document Storage Modes: Smart Import & Secure Index
        </h4>
        <p>
          Structra offers two distinct operational modes for handling Gmail document attachments:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Smart Import:</strong> Original document binaries may be persisted in Supabase Storage and remain available for download and in-app viewing until the document is deleted.
          </li>
          <li>
            <strong>Secure Index:</strong> The original document binary is processed temporarily in memory for OCR extraction and indexing and is not persistently stored by Structra. Metadata, extracted text, summaries, chunks, and embeddings may still remain available for retrieval, while links open directly to the original message in the native Gmail web interface.
          </li>
        </ul>
      </section>

      {/* 3. AI Processing & Model Training */}
      <section className="space-y-3">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          3. AI Processing & Model Training
        </h4>
        <p>
          Structra uses Google Gemini API services to provide document-processing and AI-powered features, including document extraction, OCR, embeddings, search reranking, and AI-assisted question answering.
        </p>
        <p>
          Structra does not use your private documents or Google user data to train, retrain, or improve generalized or non-personalized AI/ML models.
        </p>
        <p>
          For Gemini API processing, Structra uses Google's paid/billed API service. Under Google's current Gemini API terms for paid services, submitted content is not used to improve Google's products. Google may retain API logs for limited operational and safety purposes according to the applicable Gemini API data-retention settings and terms.
        </p>
        <p>
          Structra does not represent its Gemini API usage as Zero Data Retention unless the applicable Google Cloud/Gemini project has separately been configured and approved for a Zero Data Retention arrangement.
        </p>
      </section>

      {/* 4. Data Storage & Security */}
      <section className="space-y-3">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          4. Data Storage & Security
        </h4>
        <p>
          Structra uses layered security controls to protect user information.
        </p>
        <p>
          Gmail OAuth credentials are encrypted at the application layer using AES-256-GCM and are stored server-side. OAuth credentials are not exposed to the browser.
        </p>
        <p>
          Document data stored through Structra's Supabase infrastructure benefits from Supabase's infrastructure-level encryption at rest and encrypted network communications.
        </p>
        <p>
          Structra additionally uses authenticated access controls, tenant isolation, and database-level security policies to restrict access to user data.
        </p>
        <p>
          Structra does not represent infrastructure-level encryption as field-level encryption of every document-text value.
        </p>
      </section>

      {/* 5. Third-Party Service Providers */}
      <section className="space-y-3">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          5. Third-Party Service Providers
        </h4>
        <p>
          Structra relies on third-party infrastructure providers necessary to operate the service.
        </p>
        
        <div className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
          <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Google</h5>
          <p>Google services are used for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gmail authentication and read-only mailbox access</li>
            <li>Retrieval of eligible Gmail document attachments</li>
            <li>Gemini API document processing and AI functionality</li>
          </ul>
        </div>

        <div className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
          <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Supabase</h5>
          <p>Supabase provides database and storage infrastructure used for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Document metadata</li>
            <li>Extracted and OCR text</li>
            <li>Document chunks</li>
            <li>Vector embeddings</li>
            <li>Integration information</li>
            <li>Encrypted OAuth credentials</li>
            <li>Original document files when Smart Import is enabled</li>
          </ul>
        </div>

        <div className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
          <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Application Hosting Provider</h5>
          <p>
            Structra's application and server-side infrastructure is hosted by its designated hosting provider. The hosting provider may process information necessary to operate the application, server functions, security systems, and application logs.
          </p>
        </div>

        <p>
          Structra does not sell user documents or Google user data to these providers or to unrelated third parties.
        </p>
        <p>
          Information is transferred to these providers only as necessary to provide Structra's requested functionality, maintain the service, protect security, comply with applicable law, or otherwise support the operation of the service.
        </p>
      </section>

      {/* 6. Data Retention */}
      <section className="space-y-3">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          6. Data Retention
        </h4>
        <p>
          Structra retains user data for as long as necessary to provide the requested functionality or until the user deletes the applicable data, subject to applicable legal requirements.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            For documents imported through Smart Import, the original document binary may remain stored until the document is deleted.
          </li>
          <li>
            For Secure Index documents, the original binary is processed temporarily and is not persistently stored by Structra.
          </li>
          <li>
            Extracted text, metadata, document chunks, summaries, and embeddings may remain stored until the associated document is deleted.
          </li>
          <li>
            Gmail OAuth credentials are retained while the Gmail integration remains connected and are removed when the integration is disconnected.
          </li>
        </ul>
        <p>
          Third-party providers may have their own limited operational, security, or service-level retention periods governed by their applicable terms and policies.
        </p>
      </section>

      {/* 7. Google API Limited Use */}
      <section className="space-y-3">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          7. Google API Limited Use
        </h4>
        <p>
          Structra's use and transfer of information received from Google APIs complies with applicable Google API Services User Data Policy requirements, including the Limited Use requirements.
        </p>
        <p>
          Structra uses Google user data only to provide or improve user-facing functionality that users have explicitly requested through the Structra Gmail integration.
        </p>
        <p>Structra does not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sell Google user data;</li>
          <li>Use Google user data for advertising;</li>
          <li>Transfer Google user data to advertising networks;</li>
          <li>Transfer Google user data to data brokers or information resellers;</li>
          <li>Use Google user data for creditworthiness or lending purposes; or</li>
          <li>Use Google user data to train, retrain, or improve generalized AI/ML models.</li>
        </ul>
        <p>
          Structra requests Gmail read-only access because its Gmail integration must inspect eligible Gmail messages and attachment metadata and retrieve supported document attachments. Structra does not use Gmail access to send, modify, delete, archive, or label Gmail messages.
        </p>
      </section>

      {/* 8. Gmail Disconnection & Document Deletion */}
      <section className="space-y-3">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          8. Gmail Disconnection & Document Deletion
        </h4>
        <div className="space-y-2">
          <p>
            <strong>Gmail Disconnection:</strong> You may disconnect your Gmail integration at any time through the Integrations dashboard. Disconnecting Gmail revokes the applicable Google OAuth authorization at Google's OAuth revocation endpoint, removes stored Gmail OAuth credentials from Structra, and stops future Gmail synchronization. Disconnecting Gmail does not automatically delete documents already imported into Structra; imported Structra documents remain in your account until explicitly deleted.
          </p>
          <p>
            <strong>Document Deletion:</strong> You can permanently delete individual documents from your workspace at any time. Deleting an individual Structra document removes its associated Structra data, including the document record, metadata, OCR and extracted text, summaries, chunks, vector embeddings, cached processing data, stored original binary where applicable (in Smart Import mode), and Gmail source metadata. Deleting a document in Structra does not delete the original Gmail message or attachment from your Gmail account.
          </p>
        </div>
      </section>

      {/* 9. Contact & Privacy Inquiries */}
      <section className="space-y-2">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          9. Contact & Privacy Inquiries
        </h4>
        <p>
          If you have questions regarding this Privacy Policy, our data protection practices, or compliance with Google API User Data Policies, please contact our privacy compliance team at <span className="font-bold text-blue-600 dark:text-blue-400">privacy@structra.app</span>.
        </p>
      </section>
    </div>
  );
};
