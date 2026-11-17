"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Dialog, useDialogActions } from "@/components/ui/dialog";

const NAVIGATION = [
  { id: "inicio", label: "Inicio" },
  { id: "sobre-mi", label: "El estudio" },
  { id: "areas", label: "Áreas de práctica" },
  { id: "preguntas", label: "Preguntas frecuentes" },
] as const;

function MobileMenuContent({ activeSection }: { activeSection: string }) {
  const { close } = useDialogActions();
  function closeForNavigation() {
    close({ motion: "none" });
  }

  return (
    <>
      <div className="mobile-menu-header">
        <Image src="/brand/logo-dark.png" alt="Abril Latallada D’Elias · Abogada" width={130} height={68} sizes="130px" />
        <Dialog.Close className="menu-close" id="menu-close" aria-label="Cerrar menú"><Icon name="close" /></Dialog.Close>
      </div>
      <p className="mobile-menu-title" id="mobile-menu-title">Navegá por el estudio</p>
      <nav id="mobile-nav" className="mobile-nav" aria-label="Navegación móvil">
        {NAVIGATION.map(({ id, label }) => (
          <a key={id} href={`#${id}`} data-nav className={activeSection === id ? "is-active" : undefined} aria-current={activeSection === id ? "location" : undefined} onClick={closeForNavigation}>
            {label} <Icon name="arrow" />
          </a>
        ))}
      </nav>
      <div className="mobile-menu-bottom">
        <a className="button" href="#consulta" onClick={closeForNavigation}>Preparar mi consulta <Icon name="arrow" /></a>
        <p>Atención personal.<br />Rocha, Uruguay.</p>
      </div>
    </>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("inicio");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const backToTopVisibleRef = useRef(false);
  const activeSectionRef = useRef("inicio");
  const headerRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    document.documentElement.classList.add("motion-ready");
    const desktopViewport = matchMedia("(min-width: 1025px)");
    const sections = [...NAVIGATION.map(({ id }) => id), "consulta"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    let animationFrame = 0;

    function updateNavigation() {
      animationFrame = 0;
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight)) : 0;
      progressRef.current?.style.setProperty("--reading-progress", progress.toFixed(4));
      const shouldShowBackToTop = window.scrollY > Math.max(480, window.innerHeight * 0.7);
      if (backToTopVisibleRef.current !== shouldShowBackToTop) {
        backToTopVisibleRef.current = shouldShowBackToTop;
        setShowBackToTop(shouldShowBackToTop);
      }
      const activationPoint = window.scrollY + (headerRef.current?.getBoundingClientRect().height ?? 0) + 96;
      let currentSection = "inicio";
      let closestPosition = -Infinity;
      for (const section of sections) {
        const position = section.id === "inicio" ? 0 : section.getBoundingClientRect().top + window.scrollY;
        if (position <= activationPoint && position >= closestPosition) {
          closestPosition = position;
          currentSection = section.id;
        }
      }
      if (activeSectionRef.current !== currentSection) {
        activeSectionRef.current = currentSection;
        setActiveSection(currentSection);
      }
    }

    function scheduleUpdate() {
      if (!animationFrame) animationFrame = requestAnimationFrame(updateNavigation);
    }

    function closeAtDesktop(event: MediaQueryListEvent) {
      if (event.matches) setMenuOpen(false);
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    document.addEventListener("toggle", scheduleUpdate, true);
    document.addEventListener("load", scheduleUpdate, true);
    desktopViewport.addEventListener("change", closeAtDesktop);
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
      document.removeEventListener("toggle", scheduleUpdate, true);
      document.removeEventListener("load", scheduleUpdate, true);
      desktopViewport.removeEventListener("change", closeAtDesktop);
    };
  }, []);

  return (
    <>
      <header className="site-header" ref={headerRef}>
        <div className="reading-progress" ref={progressRef} aria-hidden="true" />
        <div className="container header-inner">
          <a className="brand" href="#inicio" aria-label="Abril Latallada D’Elias, inicio">
            <Image src="/brand/logo-dark.png" alt="Abril Latallada D’Elias · Abogada" width={160} height={83} sizes="128px" preload />
          </a>
          <nav className="desktop-nav" aria-label="Navegación principal">
            {NAVIGATION.map(({ id, label }) => (
              <a key={id} href={`#${id}`} data-nav className={activeSection === id ? "is-active" : undefined} aria-current={activeSection === id ? "location" : undefined}>{label}</a>
            ))}
          </nav>
          <a className="header-cta" href="#consulta">Preparar mi consulta <Icon name="arrow" /></a>
          <button className="menu-toggle" type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}>
            <span>Menú</span><Icon name="menu" />
          </button>
        </div>
      </header>
      <Dialog.Root id="mobile-menu" className="mobile-menu" titleId="mobile-menu-title" open={menuOpen} onClose={closeMenu}>
        <MobileMenuContent activeSection={activeSection} />
      </Dialog.Root>
      {showBackToTop ? <a className="back-to-top" href="#inicio" aria-label="Volver arriba" title="Volver arriba"><Icon name="down" /></a> : null}
    </>
  );
}
