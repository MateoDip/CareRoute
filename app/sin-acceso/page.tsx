import { salir } from "../ingresar/acciones";

/**
 * /sin-acceso — hay sesión, pero la cuenta todavía no puede operar (regla 4 de
 * la spec): entró con Google y un admin aún no le asignó centro, o su rol no es
 * clínico. No es un 404: el problema no es la URL sino la cuenta.
 */
export default function SinAcceso() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Tu cuenta todavía no puede operar</h1>
      <p>
        Para ver y crear derivaciones necesitás un centro de salud asignado y un
        rol de médico. Pedíselo a un administrador de CareRoute y volvé a entrar.
      </p>
      <form action={salir}>
        <button
          type="submit"
          className="w-full rounded border border-foreground/30 px-4 py-3 font-medium hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:w-auto"
        >
          Salir y entrar con otra cuenta
        </button>
      </form>
    </main>
  );
}
