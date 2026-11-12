import { FranjaTriaje, Marca } from "@/components/marca";

/**
 * Layout de las pantallas sin sesión requerida (grupo (public)). Ni barra ni
 * datos de usuario.
 *
 * Desde lg: dos columnas. A la izquierda, sobre petróleo, qué es CareRoute; a la
 * derecha, el contenido de la pantalla. En el teléfono queda solo la marca
 * arriba y el contenido: el médico vino a entrar, no a leer.
 */
export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between gap-10 bg-primary p-12 text-primary-foreground lg:flex">
        <Marca grande invertida />
        <div className="flex max-w-md flex-col gap-5">
          <p className="text-4xl font-bold leading-tight tracking-tight text-balance">
            Derivá pacientes críticos sin llamar hospital por hospital.
          </p>
          <p className="text-lg leading-relaxed opacity-90">
            Camas libres de cada centro, nivel de urgencia sugerido y el estado
            de cada traslado, en un solo lugar.
          </p>
        </div>
        <FranjaTriaje className="max-w-xs" />
      </aside>

      <div className="flex flex-col">
        <header className="mx-auto w-full max-w-md px-6 pt-8 lg:hidden">
          <Marca />
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
