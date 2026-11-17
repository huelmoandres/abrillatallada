import { ConsultationProvider } from "@/components/consultation/consultation-provider";
import { ConsultationDialogs } from "@/components/consultation/consultation-dialogs";
import { AboutSection } from "@/components/sections/about-section";
import { ContactSection } from "@/components/sections/contact-section";
import { FaqSection } from "@/components/sections/faq-section";
import { Hero } from "@/components/sections/hero";
import { PracticeSection } from "@/components/sections/practice-section";
import { PreparationSection } from "@/components/sections/preparation-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { resolveContactConfiguration } from "@/lib/contact";

export default function HomePage() {
  const { whatsappUrl } = resolveContactConfiguration({ WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER });
  return (
    <>
      <SiteHeader />
      <ConsultationProvider>
        <main id="contenido">
          <Hero />
          <PracticeSection />
          <AboutSection />
          <PreparationSection />
          <FaqSection />
          <ContactSection />
        </main>
        <ConsultationDialogs />
      </ConsultationProvider>
      <SiteFooter />
      <FloatingWhatsApp whatsappUrl={whatsappUrl} />
    </>
  );
}
