import { cn } from "@/lib/utils";

/**
 * Aviso de "Cargando…" con un relojito cuya aguja gira. Lo usan los
 * `loading.tsx` de cada pantalla y los enlaces de la barra mientras navegan.
 *
 * El texto siempre está: el reloj es decorativo (aria-hidden) y el estado lo
 * anuncia `role="status"` a los lectores de pantalla. Con "reducir movimiento"
 * activado en el sistema, la aguja queda quieta.
 */
export function Cargando({
  texto = "Cargando…",
  className,
}: {
  texto?: string;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={cn("flex items-center gap-2 text-sm font-medium text-muted-foreground", className)}
    >
      <Relojito />
      {texto}
    </p>
  );
}

/** Solo el reloj, para ponerlo al lado de un texto que ya existe (un enlace). */
export function Relojito({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative inline-block size-5 shrink-0 text-primary", className)}>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full fill-none stroke-current">
        <circle cx={12} cy={12} r={9.5} strokeWidth={2} />
        <path d="M12 7v5" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 size-full animate-spin fill-none stroke-current [animation-duration:1.4s] motion-reduce:animate-none"
      >
        <path d="M12 12h4.5" strokeWidth={2} strokeLinecap="round" />
      </svg>
    </span>
  );
}
