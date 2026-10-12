import { Outlet } from "react-router-dom"
import { SiteHeader, MobileActionsBar } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { WhatsAppButton } from "@/components/layout/whatsapp-button"

function MarketingLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <MobileActionsBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  )
}

export default MarketingLayout
