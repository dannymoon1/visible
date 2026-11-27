import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage, List, Section } from "@/components/site/LegalPage";

// Creator terms (tier 1 of the creator-launch build, drafted 2026-11-27 for the
// founder's review). They restate the rules in CLAUDE.md → The model; when a
// rule there changes, change it here too. Undecided points are marked <Fill>.

const DRAFT = true;

export const metadata: Metadata = {
  title: "Creator terms",
  description: "The rules for creators on Visibility Campaigns: posting, getting paid, and fake views.",
  robots: DRAFT ? { index: false, follow: false } : undefined,
};

export default function CreatorTermsPage() {
  return (
    <LegalPage
      title="Creator terms"
      updated="27 November 2026"
      draft={DRAFT}
      intro={
        <p>
          These terms are the agreement between you and <Fill>company name</Fill> (&ldquo;Visibility
          Campaigns&rdquo;, &ldquo;we&rdquo;) when you post for businesses through Visibility Campaigns. By creating an
          account you accept them. Please read the parts on getting paid and fake views closely.
        </p>
      }
    >
      <Section title="1. Who can join">
        <List>
          <li>You are 18 or older and live in Nigeria.</li>
          <li>You have one Visibility account, in your own name, and the social accounts you add are yours.</li>
          <li>What you tell us about yourself is true, and you keep it up to date.</li>
        </List>
      </Section>

      <Section title="2. Open and verified campaigns">
        <p>
          <strong>Open campaigns</strong> are for any creator with an account. <strong>Verified campaigns</strong> are
          for creators we have verified on that platform. We verify each platform separately, and we look for:
        </p>
        <List>
          <li>at least 1,000 followers and 5,000 views in the last 30 days on that platform</li>
          <li>an account at least 3 months old, with 8 or more posts in the last 30 days</li>
          <li>a practice campaign completed to the standard we ask</li>
          <li>an ID whose name matches your bank account name</li>
        </List>
        <p>
          Our founding creators can qualify with 500 followers and 2,500 views. We can refuse or remove verification if
          the numbers drop or the rules here are broken.
        </p>
        <p>
          Joining a campaign doesn&apos;t guarantee a spot. When more creators join a verified campaign than there are
          spots, we choose who gets them, and others may wait on a standby list.
        </p>
      </Section>

      <Section title="3. How you post">
        <List>
          <li>
            Each campaign has a <strong>brief</strong>, never a script. Post in your own words and your own style, and
            keep to what the brief asks.
          </li>
          <li>
            Every campaign post carries a <strong>paid-partnership label</strong>: the platform&apos;s own tool where it
            has one, or a clear &ldquo;#ad&rdquo; or &ldquo;Paid partnership&rdquo; in the caption.
          </li>
          <li>Say only what is true about the business. Don&apos;t promise results the business hasn&apos;t promised.</li>
          <li>Follow each platform&apos;s rules and Nigerian law, including advertising rules.</li>
          <li>
            Keep each post live for <strong>30 days</strong>, and don&apos;t edit out the business, the label or the
            contact details in that time.
          </li>
          <li>You can turn down any campaign. You never have to post about something you don&apos;t believe in.</li>
        </List>
        <p>
          We don&apos;t run campaigns for Ponzi schemes, unlicensed loan apps, betting or partisan politics. If you see one,
          tell us.
        </p>
      </Section>

      <Section title="4. How you're paid">
        <p>Each campaign shows its pay before you join. The rules are:</p>
        <List>
          <li>
            <strong>Open campaigns</strong> pay for views only. A post earns once it passes 1,000 views, at the
            campaign&apos;s rate per 1,000 views.
          </li>
          <li>
            <strong>Verified campaigns</strong> pay a fee for each post, plus pay for views from the first view. The
            post fee is earned when the post is approved and still live 7 days later.
          </li>
          <li>
            Views count for 14 days after you post. Each campaign has a <strong>maximum view pay per post</strong>; a
            post that goes past it earns the maximum.
          </li>
          <li>
            View pay is final when the campaign closes. If the views on a campaign would cost more than the
            business set aside for views, everyone&apos;s view pay on that campaign is reduced by the same percentage.
          </li>
          <li>
            <strong>You keep 100%.</strong> We charge creators no fees.
          </li>
          <li>
            Everything you earn by the last day of a month is paid on the <strong>5th of the next month</strong> to the
            bank account in your name. The minimum payout is ₦1,000 until 31 January 2027, then ₦5,000. Smaller balances
            roll over to the next month.
          </li>
          <li>
            You are responsible for any tax on what you earn. You work for yourself; these terms don&apos;t make you our
            employee.
          </li>
        </List>
      </Section>

      <Section title="5. Fake views and fraud">
        <p>Businesses pay us only for real views, so this rule is strict. You must not:</p>
        <List>
          <li>buy views, likes or followers, or use bots, apps or groups that inflate them</li>
          <li>edit screenshots, or send proof of a post that isn&apos;t yours or isn&apos;t live</li>
          <li>run more than one Visibility account, or use someone else&apos;s social account</li>
        </List>
        <p>
          If we find fake views or fraud, you are removed from the campaign and <strong>not paid</strong> for it, and we
          can close your account. We can also take back money already paid for views that turn out to be fake{" "}
          <Fill>decide: keep or drop this sentence</Fill>. Before closing an account we&apos;ll tell you why and let you
          answer, unless the law stops us.
        </p>
      </Section>

      <Section title="6. Your content">
        <p>
          Your posts stay yours. You give the business and us permission to share and repost your campaign posts, with
          credit to you, for <Fill>decide: how long, for example 12 months</Fill>, including in reports and on our own
          pages. We won&apos;t edit your words or use your post in paid ads without asking you first.
        </p>
      </Section>

      <Section title="7. Closing your account">
        <p>
          You can close your account at any time by emailing <Fill>support email address</Fill>. We pay what you&apos;ve
          already earned on the next payout day, if it&apos;s at least the minimum. We can suspend or close an account
          that breaks these terms.
        </p>
      </Section>

      <Section title="8. Our responsibility">
        <p>
          We work to keep the service running and pay you on time, but we can&apos;t promise any number of campaigns,
          views or earnings. We aren&apos;t responsible for what a platform does to your account. Nothing in these terms
          limits rights you have under Nigerian consumer law.
        </p>
      </Section>

      <Section title="9. Changes and the law">
        <p>
          If we change these terms, we&apos;ll update this page and tell you before the change takes effect. Changes never
          reduce pay you&apos;ve already earned. These terms are governed by the laws of Nigeria, and we&apos;ll try to settle
          any disagreement by talking first.
        </p>
        <p>
          How we handle your information is in our{" "}
          <Link href="/privacy" className="font-medium text-ink underline decoration-signal decoration-2 underline-offset-4">
            Privacy policy
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
