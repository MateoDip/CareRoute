import { redirect } from "next/navigation";
import { entrarConGoogle } from "@/app/acciones-sesion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { obtenerUsuario } from "@/lib/auth";

type Props = { searchParams: Promise<{ error?: string | string[] }> };

/** /ingresar — login con Google. Server Component: el botón envía un form a una Server Action. */
export default async function Ingresar({ searchParams }: Props) {
  // Con sesión no tiene sentido volver a entrar.
  if (await obtenerUsuario()) redirect("/");
  const { error } = await searchParams;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Ingresar</h1>
        <p className="text-muted-foreground">
          Coordinación de derivaciones entre centros de salud. Entrá con la
          cuenta de Google que te habilitó tu centro.
        </p>
      </div>

      {error !== undefined && (
        <Alert variant="destructive">
          <AlertTitle>No pudimos iniciar sesión</AlertTitle>
          <AlertDescription>
            <p>Google no confirmó el ingreso o se canceló. Probá de nuevo.</p>
          </AlertDescription>
        </Alert>
      )}

      <form action={entrarConGoogle}>
        <Button type="submit" size="lg" className="w-full">
          Entrar con Google
        </Button>
      </form>
    </>
  );
}
