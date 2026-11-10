/**
 * Layout de las pantallas sin sesión requerida (grupo (public)): solo un
 * encabezado con el nombre del sistema. Ni barra ni datos de usuario.
 */
export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="mx-auto w-full max-w-md px-6 pt-8">
        <p className="text-lg font-bold">CareRoute</p>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-10">
        {children}
      </main>
    </>
  );
}
