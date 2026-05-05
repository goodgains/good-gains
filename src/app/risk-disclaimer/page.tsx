import { LegalPage } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = pageMetadata.riskDisclaimer;

export default function RiskDisclaimerPage() {
  return (
    <LegalPage
      title="Risk Disclaimer"
      description="Important trading and software-use disclosure for visitors and customers."
    >
      <p>{siteConfig.disclaimer}</p>
      <p>Past performance, visual examples, or platform demonstrations do not guarantee future results.</p>
      <p>Users remain fully responsible for their trading decisions, account management, and risk exposure.</p>
    </LegalPage>
  );
}
