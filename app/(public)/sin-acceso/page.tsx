import { salir } from "@/app/acciones-sesion";
import { Button } from "@/components/ui/button";

/**
 * /sin-acceso — hay sesión, pero la cuenta todavía no puede operar (regla 4 de
 * la spec): entró con Google y un admin aún no le asignó centro, o su rol no es
 * clínico. No es un 404: el problema no es la URL sino la cuenta.
 *
 * Está en (public) porque el layout de (app) exige un médico con centro.
 */
export default function SinAcceso() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Tu cuenta todavía no puede operar</h1>
        <p className="text-muted-foreground">
          Para ver y crear derivaciones necesitás un centro de salud asignado y
          un rol de médico. Pedíselo a un administrador de CareRoute y volvé a
          entrar.
        </p>
      </div>
      <form action={salir}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Salir y entrar con otra cuenta
        </Button>
      </form>
    </>
  );
}
