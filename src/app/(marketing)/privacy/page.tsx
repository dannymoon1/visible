import type { Metadata } from "next";
import { Fill, LegalPage, List, Section } from "@/components/site/LegalPage";

// Privacy policy (tier 1 of the creator-launch build, drafted 2026-11-27 for
// the founder's review). Written against what the app really collects; if a
// feature starts collecting something new, update this page in the same change.
// Gaps the founder must fill are marked <Fill>.

const DRAFT = true;

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Visibility Campaigns collects, why, who we share it with, and your rights.",
  robots: DRAFT ? { index: false, follow: false } : undefined,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="27 November 2026"
      draft={DRAFT}
      intro={
        <p>
          Visibility Campaigns connects local businesses with creators who post about them. To do that we need some
          information about you. This page explains what we collect, why, who we share it with, how long we keep it,
          and what you can ask us to do with it. We follow the Nigeria Data Protection Act 2023.
        </p>
      }
    >
      <Section title="Who we are">
        <p>
          Visibility Campaigns is a brand of <Fill>company name, once registered with the CAC</Fill>, of{" "}
          <Fill>registered address</Fill>. We decide how your information is used, so we are the &ldquo;data
          controller&rdquo;. Questions about your data go to <Fill>privacy email address</Fill>.
        </p>
      </Section>

      <Section title="What we collect">
        <p>
          <strong>When you create an account:</strong> your name, email address and a password (stored scrambled, so
          we can never read it).
        </p>
        <p>
          <strong>Creator profile:</strong> your handle, your city and state, and a link to your profile on each
          platform you post on (TikTok, Instagram, Facebook, YouTube). To verify you, we look at the public numbers on
          those profiles, such as followers, views and posts.
        </p>
        <p>
          <strong>Campaign activity:</strong> the campaigns you join, links to your posts, any screenshots you upload
          as proof, the views and other results your posts get, and whether each post was approved.
        </p>
        <p>
          <strong>Payouts:</strong> your bank name, account number and account name, and a record of what we pay you.
          When we verify creators fully, we will also ask for a government ID to check that the account name matches
          you.
        </p>
        <p>
          <strong>Businesses:</strong> the business name, the campaign details, and how customers can reach the
          business (such as a WhatsApp number). Card payments are handled by Paystack; we never see your full card
          number.
        </p>
        <p>
          <strong>Tracking links:</strong> when you open one of our links (visibilitycampaigns.com/r/&hellip;), we save
          a random number in your browser for one year and the link&apos;s name for 30 days. That lets us count how many
          people each place we post brings, and credit the link if you sign up. We don&apos;t store your IP address or
          anything that names you before you sign up.
        </p>
        <p>
          <strong>Bot check:</strong> sign-up and sign-in use Cloudflare Turnstile, which looks at signals from your
          browser and device to tell people from bots.
        </p>
      </Section>

      <Section title="Why we use it">
        <List>
          <li>To run your account and sign you in (needed to give you the service).</li>
          <li>
            To verify creators, match them with campaigns, count views and pay them correctly (needed to give you the
            service).
          </li>
          <li>
            To catch fake views, fake accounts and fraud, so businesses only pay for real results (our legitimate
            interest, and yours).
          </li>
          <li>To show businesses a report of each post, its views, clicks and chats (needed for the service).</li>
          <li>To email you about your account, campaigns and payouts. We don&apos;t send marketing without your consent.</li>
          <li>To keep records that tax and accounting law require (a legal obligation).</li>
        </List>
      </Section>

      <Section title="Who sees it">
        <p>
          <strong>Businesses</strong> see your handle, your posts and their results on their campaigns. They don&apos;t
          see your email, phone number or bank details.
        </p>
        <p>
          <strong>Our team</strong> sees what they need to verify creators, review posts and make payouts.
        </p>
        <p>
          <strong>Companies that run parts of the service for us</strong>, only for that purpose and under contract:
        </p>
        <List>
          <li>Supabase: our database and sign-in (servers in Ireland, in the EU)</li>
          <li>Vercel: hosts the website</li>
          <li>Resend: sends our emails</li>
          <li>Cloudflare: the bot check on sign-up</li>
          <li>Paystack: takes card and bank payments from businesses</li>
          <li>Groq: AI that suggests post ideas and helps check posts against the brief</li>
        </List>
        <p>
          Some of these store data outside Nigeria. We only use providers that protect it to a standard the Nigeria
          Data Protection Act accepts. We never sell your information.
        </p>
        <p>We share information with the police, courts or regulators only when the law requires us to.</p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account information while your account is open. If you close it, we delete or anonymise it
          within <Fill>90 days</Fill>, except payment and tax records, which we keep for <Fill>6 years</Fill> as the
          law requires, and records of fraud, which we keep as long as we need them to protect businesses and other
          creators.
        </p>
      </Section>

      <Section title="Your rights">
        <p>You can ask us to:</p>
        <List>
          <li>give you a copy of the information we hold about you</li>
          <li>correct anything that&apos;s wrong</li>
          <li>delete your information, where we don&apos;t have to keep it by law</li>
          <li>stop or limit how we use it, or send it to you in a format another service can use</li>
          <li>withdraw any consent you gave, such as for marketing emails</li>
        </List>
        <p>
          Email <Fill>privacy email address</Fill> and we&apos;ll reply within 30 days. If you&apos;re not happy with our
          answer, you can complain to the Nigeria Data Protection Commission (ndpc.gov.ng).
        </p>
      </Section>

      <Section title="Age">
        <p>You must be 18 or older to use Visibility Campaigns. We don&apos;t knowingly collect information from anyone younger.</p>
      </Section>

      <Section title="Keeping it safe">
        <p>
          Your information is stored encrypted, every table in our database is locked so people only see what
          they&apos;re allowed to, and only the team members who need it can reach it. No system is perfect: if a breach
          puts your information at risk, we&apos;ll tell you and the Commission as the law requires.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we change how we use your information, we&apos;ll update this page and its date. If the change matters, we&apos;ll
          also tell you by email or in the app before it takes effect.
        </p>
      </Section>
    </LegalPage>
  );
}
