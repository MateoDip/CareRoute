import { redirect } from "next/navigation";
import { obtenerUsuario } from "@/lib/auth";
import { entrarConGoogle } from "./acciones";

type Props = { searchParams: Promise<{ error?: string | string[] }> };

/** /ingresar — login con Google. Server Component: el botón envía un form a una Server Action. */
export default async function Ingresar({ searchParams }: Props) {
  // Con sesión no tiene sentido volver a entrar.
  if (await obtenerUsuario()) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">CareRoute</h1>
        <p className="mt-2 text-foreground/70">
          Coordinación de derivaciones entre centros de salud.
        </p>
      </div>

      {error !== undefined && (
        <p
          role="alert"
          className="rounded border border-red-700 p-3 text-red-700 dark:border-red-400 dark:text-red-400"
        >
          No pudimos iniciar sesión con Google. Probá de nuevo.
        </p>
      )}

      <form action={entrarConGoogle}>
        <button
          type="submit"
          className="w-full rounded bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Entrar con Google
        </button>
      </form>
    </main>
  );
}
