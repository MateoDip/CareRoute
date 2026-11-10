import type { Metadata } from "next";
import { BadgeEstado, BadgeNivel } from "@/components/estado-solicitud";
import {
  FiltroSolicitudes,
  type SolicitudEnLista,
} from "@/components/filtro-solicitudes";
import { SinDatos } from "@/components/sin-datos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { ETIQUETA_ESTADO } from "@/lib/formato";
import { estadoSolicitudSchema } from "@/lib/schemas/solicitud-traslado";
import { nivelUrgenciaSchema } from "@/lib/schemas/evaluacion-triaje";

export const metadata: Metadata = { title: "Sistema visual · CareRoute" };

/*
 * Datos de ejemplo, inventados: no son pacientes ni centros reales. Incluyen un
 * caso con texto muy largo para ver que nada se corte ni desborde a 375 px.
 */
const CENTRO_LARGO =
  "Hospital Interzonal General de Agudos Profesor Doctor Luis Güemes — Unidad de Terapia Intensiva de Adultos y Unidad Coronaria";

const EJEMPLOS: SolicitudEnLista[] = [
  {
    id: "ejemplo-1",
    pacienteDni: "00000001",
    estado: "EVALUANDO",
    sentido: "Saliente · a Hospital de ejemplo",
    fecha: "9/11/26, 20:30",
  },
  {
    id: "ejemplo-2",
    pacienteDni: "00000002",
    estado: "APROBADA",
    sentido: `Entrante · desde ${CENTRO_LARGO}`,
    fecha: "9/11/26, 18:05",
  },
  {
    id: "ejemplo-3",
    pacienteDni: "00000003",
    estado: "PENDIENTE",
    sentido: "Saliente · sin destino todavía",
    fecha: "8/11/26, 07:45",
  },
];

/**
 * /sistema — galería del sistema visual (clase 10), detrás de la sesión.
 *
 * Cada componente con todas sus variantes y estados en un solo lugar, para
 * revisar contraste, foco con teclado y que ningún estado dependa solo del
 * color. No lee datos reales: lo que se ve acá es lo que usan las pantallas.
 */
export default async function Sistema() {
  await requerirMedicoEnPagina();

  const estados = estadoSolicitudSchema.options.map((valor) => ({
    valor,
    etiqueta: ETIQUETA_ESTADO[valor],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Sistema visual</h1>
        <p className="text-muted-foreground">
          Componentes compartidos y sus estados. Recorrela con Tab para ver el
          foco, y en el inspector a 375 px de ancho.
        </p>
      </div>

      <Seccion titulo="Botones">
        <div className="flex flex-wrap gap-3">
          <Button>Principal</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="link">Enlace</Button>
          <Button variant="destructive">Rechazar derivación</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Chico</Button>
          <Button>Normal</Button>
          <Button size="lg">Grande</Button>
          <Button disabled>Guardando…</Button>
        </div>
      </Seccion>

      <Seccion titulo="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Principal</Badge>
          <Badge variant="secondary">Secundario</Badge>
          <Badge variant="outline">Contorno</Badge>
          <Badge variant="destructive">Destructivo</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Estados de una solicitud:</p>
        <div className="flex flex-wrap gap-2">
          {estadoSolicitudSchema.options.map((estado) => (
            <BadgeEstado key={estado} estado={estado} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Niveles de urgencia:</p>
        <div className="flex flex-wrap gap-2">
          {nivelUrgenciaSchema.options.map((nivel) => (
            <BadgeNivel key={nivel} nivel={nivel} />
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Campos">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sistema-dni" className="text-sm font-medium">
            DNI del paciente
          </label>
          <Input id="sistema-dni" inputMode="numeric" placeholder="Sin puntos" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sistema-dni-error" className="text-sm font-medium">
            DNI del paciente (con error)
          </label>
          <Input
            id="sistema-dni-error"
            inputMode="numeric"
            defaultValue="12.345"
            aria-invalid="true"
            aria-describedby="sistema-dni-error-texto"
          />
          <p id="sistema-dni-error-texto" className="text-sm text-destructive">
            El DNI solo puede tener números.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sistema-deshabilitado" className="text-sm font-medium">
            Campo deshabilitado
          </label>
          <Input id="sistema-deshabilitado" disabled defaultValue="No editable" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sistema-select" className="text-sm font-medium">
            Selector nativo
          </label>
          <NativeSelect id="sistema-select" defaultValue="UTI">
            <option value="UTI">UTI</option>
            <option value="UCO">UCO</option>
            <option value="SALA_COMUN">Sala común</option>
          </NativeSelect>
        </div>
      </Seccion>

      <Seccion titulo="Alertas">
        <Alert>
          <AlertTitle>Aviso</AlertTitle>
          <AlertDescription>
            <p>La sugerencia de urgencia la revisa siempre un médico.</p>
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar esta pantalla</AlertTitle>
          <AlertDescription>
            <p>
              Es un problema del sistema, no de algo que hayas hecho. No se
              perdió nada de lo que ya estaba guardado. (Es el estado de error
              de error.tsx.)
            </p>
          </AlertDescription>
        </Alert>
      </Seccion>

      <Seccion titulo="Cargando (esqueleto)">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </Seccion>

      <Seccion titulo="Vacío">
        <SinDatos
          titulo="Tu centro todavía no tiene solicitudes"
          descripcion="Cuando un médico de tu centro inicie una derivación, o cuando otro centro elija al tuyo como destino, la vas a ver acá."
        />
        <SinDatos
          titulo="No hay solicitudes entrantes"
          descripcion="Con acción: la salida desde el estado vacío."
          accion={{ href: "/", texto: "Ver todas las solicitudes" }}
        />
      </Seccion>

      <Seccion titulo="Listado, sin resultados y texto largo">
        <p className="text-sm text-muted-foreground">
          Datos de ejemplo. Elegí «Rechazada» para ver el estado sin resultados.
        </p>
        <FiltroSolicitudes solicitudes={EJEMPLOS} estados={estados} />
        <SinDatos
          titulo={`Título muy largo para probar el corte de línea: ${CENTRO_LARGO}`}
          descripcion="Palabra sin espacios: EstaPalabraNoTieneEspaciosParaComprobarQueNoRompaElAnchoDeLaPantallaEnUnTelefono."
        />
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-lg">
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}
