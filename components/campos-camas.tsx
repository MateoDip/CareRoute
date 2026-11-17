"use client";

import type { TipoUnidad } from "@prisma/client";
import { Campo } from "@/components/campo";
import { Input } from "@/components/ui/input";
import { ETIQUETA_UNIDAD } from "@/lib/formato";
import type { EstadoFormulario } from "@/lib/formularios";

const TIPOS = ["UTI", "UCO", "SALA_COMUN", "GUARDIA"] as const satisfies readonly TipoUnidad[];

type Props = {
  estado: EstadoFormulario;
  /** Las camas libres actuales de cada tipo, para mostrar al editar. */
  inicial?: Partial<Record<TipoUnidad, number>>;
};

/**
 * Las camas libres de cada tipo de unidad: cuatro campos, uno por tipo (regla 7,
 * HU05). Los usan el alta de un centro (admin), la edición del admin y la
 * pantalla de camas del receptor. Cada campo se llama como el tipo (UTI, UCO…),
 * así el error de Zod cae debajo del campo que corresponde.
 *
 * Son cantidades: teclado numérico (inputMode) y el servidor valida que sean
 * enteros de cero en adelante.
 */
export function CamposCamas({ estado, inicial }: Props) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-semibold">Camas libres por unidad</legend>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {TIPOS.map((tipo) => (
          <Campo key={tipo} etiqueta={ETIQUETA_UNIDAD[tipo]} errores={estado.errores?.[tipo]}>
            {(control) => (
              <Input
                {...control}
                name={tipo}
                inputMode="numeric"
                autoComplete="off"
                defaultValue={estado.valores?.[tipo] ?? String(inicial?.[tipo] ?? 0)}
              />
            )}
          </Campo>
        ))}
      </div>
    </fieldset>
  );
}
