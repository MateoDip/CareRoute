import type { Metadata } from "next";
import { EncabezadoDelFlujo } from "@/components/encabezado-del-flujo";
import { Card, CardContent } from "@/components/ui/card";
import { requerirMedicoEnPagina } from "@/lib/auth";
import { FormularioNuevaSolicitud } from "./formulario";

export const metadata: Metadata = { title: "Nueva solicitud · CareRoute" };

/**
 * /solicitudes/nueva — paso 1 del flujo (HU01). Solo para el médico derivante:
 * para otro rol la pantalla no existe (404), igual que en la API (403).
 */
export default async function NuevaSolicitud() {
  await requerirMedicoEnPagina("MEDICO_DERIVANTE");

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoDelFlujo
        paso={1}
        titulo="Nueva solicitud de derivación"
        descripcion="Empezá con el DNI del paciente. En el paso siguiente cargás los signos vitales y la IA sugiere el nivel de urgencia."
        volver={{ href: "/", texto: "Volver a las solicitudes" }}
      />
      <Card>
        <CardContent>
          <FormularioNuevaSolicitud />
        </CardContent>
      </Card>
    </div>
  );
}
