import type { Metadata } from "next";
import { LegalShell, Section, Bullets, CONTACT_EMAIL } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Privacy Policy — packrite",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="June 29, 2026">
      <Section title="Overview">
        <p>
          This Privacy Policy explains how packrite (&ldquo;we,&rdquo;
          &ldquo;us&rdquo;) collects, uses, and shares information when you use
          the Service. We aim to collect only what we need to run packrite.
        </p>
      </Section>

      <Section title="Information we collect">
        <Bullets
          items={[
            "Account information: your email address (and, if you sign in with Google, basic profile info from Google).",
            "Photos & catalog data: the images you capture and the descriptions, brands, colors, categories, and bucket names associated with them.",
            "API key (optional): if you add your own Anthropic API key, we store it encrypted (AES-256-GCM). It is never displayed back to you in full and never sent to your browser.",
            "Subscription & payment data: plan status and identifiers from our payment processor, Stripe. We do not collect or store your full card number — Stripe handles payment details.",
            "Approximate location: a country (and, in the US, state) derived from your IP address via our hosting provider, used for aggregate analytics. We do not store your precise location or raw IP for this purpose.",
            "Usage data: limited activity such as sign-in times, number of items, and content-moderation outcomes.",
          ]}
        />
      </Section>

      <Section title="How we use information">
        <Bullets
          items={[
            "To provide and operate the Service, including AI cataloging of your photos.",
            "To moderate content for safety and legal compliance, and to enforce our Terms (including strikes and account blocking).",
            "To process subscriptions and billing.",
            "To understand aggregate usage and improve the Service.",
            "To communicate with you about your account or important changes.",
            "To detect, prevent, and respond to fraud, abuse, and security issues.",
          ]}
        />
      </Section>

      <Section title="AI processing of your photos">
        <p>
          To catalog an item, we send the photo to our AI provider,{" "}
          <span className="font-medium">Anthropic (Claude)</span>, which returns
          a description and attributes and performs a content-safety check.
          Photos are sent over the network for processing and are not used by us
          to train AI models. Anthropic&apos;s handling of API data is governed
          by its own terms and policies.
        </p>
      </Section>

      <Section title="Service providers (subprocessors)">
        <Bullets
          items={[
            "Supabase — authentication, database, and encrypted photo storage.",
            "Anthropic — AI image processing (cataloging + safety classification).",
            "Stripe — subscription payments.",
            "Vercel — application hosting and IP-based country/region detection.",
          ]}
        />
        <p>
          These providers process data on our behalf to deliver the Service.
        </p>
      </Section>

      <Section title="How we protect your data">
        <Bullets
          items={[
            "Row-Level Security ensures each user can only access their own data.",
            "Photos are stored in a private bucket and served via short-lived signed URLs.",
            "Your own API key, if provided, is encrypted at rest with AES-256-GCM and only decrypted server-side when needed.",
            "Server-side secrets are never exposed to the browser.",
          ]}
        />
        <p>
          No method of storage or transmission is 100% secure, but we work to
          protect your information.
        </p>
      </Section>

      <Section title="Sharing of information">
        <p>
          We do not sell your personal information. We share information only with
          the service providers listed above, when you choose to make a catalog
          public via a share link, or when required by law — including reporting
          apparent child sexual abuse material (CSAM) to NCMEC and relevant
          authorities.
        </p>
      </Section>

      <Section title="Data retention & deletion">
        <p>
          We retain your data while your account is active. You can delete
          individual items, or delete your account entirely, which removes your
          catalogs, items, and stored photos. Some records may be retained where
          required by law (for example, content-safety reports).
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on where you live (e.g., under GDPR or CCPA), you may have the
          right to access, correct, export, or delete your personal information,
          and to object to certain processing. To exercise these rights, contact
          us at the email below.
        </p>
      </Section>

      <Section title="Children's privacy">
        <p>
          The Service is not intended for anyone under 18, and we do not knowingly
          collect personal information from children. If you believe a child has
          provided us information, contact us and we will delete it.
        </p>
      </Section>

      <Section title="International users">
        <p>
          Your information may be processed in the United States or other
          countries where our providers operate. By using the Service, you
          consent to this processing.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes
          will be reflected by updating the &ldquo;Last updated&rdquo; date above.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or requests? Email{" "}
          <a className="text-accent hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
