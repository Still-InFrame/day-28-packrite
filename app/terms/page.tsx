import type { Metadata } from "next";
import { LegalShell, Section, Bullets, CONTACT_EMAIL } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Terms of Use — packrite",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use" updated="June 29, 2026">
      <Section title="1. Acceptance of these terms">
        <p>
          These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use
          of packrite (the &ldquo;Service&rdquo;), operated by Still In Frame
          Creatives, LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;). By creating an account or using the Service, you
          agree to these Terms. If you do not agree, do not use the Service.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 18 years old to use the Service. By using it, you
          represent that you are 18 or older and able to enter into a binding
          agreement.
        </p>
      </Section>

      <Section title="3. The Service">
        <p>
          packrite lets you photograph physical items and automatically catalog
          them. Captured photos are processed by a third-party AI provider
          (Anthropic&apos;s Claude) to generate a description, brand, color, and
          category. AI output may be inaccurate or incomplete and is provided
          &ldquo;as is&rdquo; — you are responsible for reviewing and correcting
          it.
        </p>
      </Section>

      <Section title="4. Your account">
        <p>
          You are responsible for your account credentials and for all activity
          under your account. Keep your password secure and notify us promptly of
          any unauthorized use.
        </p>
      </Section>

      <Section title="5. Acceptable use & prohibited content">
        <p>
          You are solely responsible for the photos and content you upload. You
          must not upload, store, or share content that:
        </p>
        <Bullets
          items={[
            "Depicts the sexual exploitation or abuse of minors (CSAM). We use detection tooling and will report apparent CSAM to the National Center for Missing & Exploited Children (NCMEC) and relevant authorities as required by law.",
            "Is sexual or pornographic, obscene, or depicts bestiality.",
            "Depicts graphic violence, gore, or self-harm.",
            "Promotes terrorism or violent extremism.",
            "Is non-consensual intimate imagery, or otherwise unlawful, harassing, or infringing.",
            "Contains other people's sensitive personal information that you are not authorized to store.",
          ]}
        />
        <p>
          Photographing your own lawful property — including firearms, knives, or
          other legally owned items — for personal inventory is permitted.
        </p>
      </Section>

      <Section title="6. Content moderation, strikes & suspension">
        <p>
          We use automated systems to review uploaded images. Content that
          violates Section 5 may be removed automatically. Each violation may
          result in a &ldquo;strike&rdquo; on your account; accumulating three
          (3) strikes results in your account being blocked. We may also suspend
          or terminate any account at our discretion for violations of these
          Terms or applicable law, with or without notice.
        </p>
      </Section>

      <Section title="7. Your content & license">
        <p>
          You retain ownership of the photos and content you upload. You grant us
          a limited, worldwide, non-exclusive license to host, store, process,
          display, and transmit your content solely to operate and provide the
          Service to you (including sending images to our AI provider for
          cataloging and generating signed links you choose to share).
        </p>
      </Section>

      <Section title="8. Bring-your-own API key">
        <p>
          You may optionally provide your own Anthropic API key. If you do, AI
          requests are billed to your Anthropic account, and you are responsible
          for those charges and for complying with Anthropic&apos;s terms. Your
          key is encrypted and used only to process your cataloging requests.
        </p>
      </Section>

      <Section title="9. Free tier, subscriptions & billing">
        <Bullets
          items={[
            "Free tier: a limited number of free AI catalogs per account (currently 30) on our shared API key.",
            "Unlimited plans are available by subscription ($0.99/month or $10/year), processed by our payment provider, Stripe. We do not store your full card details.",
            "Subscriptions renew automatically until cancelled. You can cancel at any time; access continues through the end of the paid period.",
            "Except where required by law, payments are non-refundable. Prices may change with notice.",
          ]}
        />
      </Section>

      <Section title="10. Shared links">
        <p>
          If you enable sharing for a catalog, anyone with the unguessable link
          can view that catalog&apos;s items (read-only) without signing in. You
          can disable sharing or rotate the link at any time. Do not share links
          to catalogs containing content you wish to keep private.
        </p>
      </Section>

      <Section title="11. Termination">
        <p>
          You may stop using the Service and delete your account at any time.
          Deleting your account removes your catalogs, items, and stored photos.
          We may suspend or terminate access as described in Section 6.
        </p>
      </Section>

      <Section title="12. Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available,&rdquo; without warranties of any kind, express or implied,
          including merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that AI-generated output is
          accurate, or that the Service will be uninterrupted or error-free.
        </p>
      </Section>

      <Section title="13. Limitation of liability">
        <p>
          To the maximum extent permitted by law, we will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or
          for lost profits or data. Our total liability for any claim relating to
          the Service will not exceed the greater of the amounts you paid us in
          the 12 months before the claim or USD $50.
        </p>
      </Section>

      <Section title="14. Indemnification">
        <p>
          You agree to indemnify and hold us harmless from claims, losses, and
          expenses arising out of your content, your use of the Service, or your
          violation of these Terms or applicable law.
        </p>
      </Section>

      <Section title="15. Changes to these terms">
        <p>
          We may update these Terms from time to time. Material changes will be
          reflected by updating the &ldquo;Last updated&rdquo; date. Your
          continued use after changes take effect constitutes acceptance.
        </p>
      </Section>

      <Section title="16. Governing law">
        <p>
          These Terms are governed by the laws of the State of Florida, United
          States, without regard to its conflict-of-laws rules, and any disputes
          will be resolved in the state or federal courts located in Florida.
        </p>
      </Section>

      <Section title="17. Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a className="text-accent hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
