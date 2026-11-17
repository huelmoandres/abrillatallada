import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contenido" className="container py-24">
      <p className="section-context">Abril Latallada D’Elias</p>
      <h1 className="mb-6 max-w-2xl text-5xl md:text-6xl">Esta página no está disponible.</h1>
      <p className="mb-8 max-w-xl text-base text-[var(--muted)]">Podés volver al inicio para conocer el estudio o preparar tu consulta.</p>
      <Link href="/" className="button">Volver al inicio</Link>
    </main>
  );
}
