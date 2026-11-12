import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Contraste de los tokens de app/globals.css con la fórmula de WCAG 2.1
 * (`npm run contraste`). Imprime la tabla de docs/spec.md §7 y termina con
 * error si algún par no llega a su mínimo: 4,5:1 para texto, 3:1 para bordes,
 * foco y gráficos.
 *
 * Si se cambia un color en globals.css, se corre esto y se pega la tabla en la spec.
 */

type Par = { texto: string; fondo: string; uso: string; minimo: number };

const PARES: Par[] = [
  { texto: "foreground", fondo: "background", uso: "texto", minimo: 4.5 },
  { texto: "foreground", fondo: "card", uso: "texto en tarjeta", minimo: 4.5 },
  { texto: "muted-foreground", fondo: "background", uso: "texto secundario", minimo: 4.5 },
  { texto: "muted-foreground", fondo: "card", uso: "texto secundario en tarjeta", minimo: 4.5 },
  { texto: "muted-foreground", fondo: "muted", uso: "texto secundario (hover)", minimo: 4.5 },
  { texto: "primary-foreground", fondo: "primary", uso: "botón principal", minimo: 4.5 },
  { texto: "primary", fondo: "background", uso: "enlace", minimo: 4.5 },
  { texto: "primary", fondo: "card", uso: "enlace en tarjeta", minimo: 4.5 },
  { texto: "primary", fondo: "accent", uso: "badge suave / opción elegida", minimo: 4.5 },
  { texto: "accent-foreground", fondo: "accent", uso: "hover", minimo: 4.5 },
  { texto: "secondary-foreground", fondo: "secondary", uso: "botón secundario", minimo: 4.5 },
  { texto: "destructive", fondo: "card", uso: "texto de error", minimo: 4.5 },
  { texto: "destructive", fondo: "destructive-suave", uso: "badge de rechazo", minimo: 4.5 },
  { texto: "destructive-foreground", fondo: "destructive", uso: "botón destructivo", minimo: 4.5 },
  { texto: "triaje-rojo-texto", fondo: "triaje-rojo-suave", uso: "badge nivel crítico", minimo: 4.5 },
  { texto: "triaje-naranja-texto", fondo: "triaje-naranja-suave", uso: "badge nivel alto", minimo: 4.5 },
  { texto: "triaje-amarillo-texto", fondo: "triaje-amarillo-suave", uso: "badge nivel medio", minimo: 4.5 },
  { texto: "triaje-verde-texto", fondo: "triaje-verde-suave", uso: "badge nivel bajo", minimo: 4.5 },
  { texto: "ring", fondo: "background", uso: "foco", minimo: 3 },
  { texto: "ring", fondo: "card", uso: "foco en tarjeta", minimo: 3 },
  { texto: "input", fondo: "card", uso: "borde de campo", minimo: 3 },
  { texto: "triaje-rojo", fondo: "card", uso: "franja de nivel crítico", minimo: 3 },
  { texto: "triaje-naranja", fondo: "card", uso: "franja de nivel alto", minimo: 3 },
  { texto: "triaje-verde", fondo: "card", uso: "franja de nivel bajo", minimo: 3 },
];

function variables(bloque: string): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const [, nombre, valor] of bloque.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    if (nombre && valor) mapa.set(nombre, valor);
  }
  return mapa;
}

function luminancia(hex: string): number {
  const canal = (inicio: number) => {
    const c = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (oscuro + 0.05);
}

const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
const claro = variables(css.slice(css.indexOf(":root"), css.indexOf("@media")));
const oscuro = variables(css.slice(css.indexOf("@media"), css.indexOf("@theme")));

const formato = (n: number) => `${n.toFixed(1).replace(".", ",")}:1`;
let fallas = 0;

console.log("| Par (texto / fondo) | Uso | Claro | Oscuro |");
console.log("|---|---|---|---|");
for (const par of PARES) {
  const celdas = [claro, oscuro].map((tema) => {
    const a = tema.get(par.texto);
    const b = tema.get(par.fondo);
    if (!a || !b) throw new Error(`Falta --${!a ? par.texto : par.fondo} en globals.css`);
    const valor = contraste(a, b);
    if (valor < par.minimo) fallas += 1;
    return valor < par.minimo ? `**${formato(valor)} ✗**` : formato(valor);
  });
  console.log(`| \`${par.texto}\` / \`${par.fondo}\` | ${par.uso} (mín. ${String(par.minimo).replace(".", ",")}) | ${celdas[0]} | ${celdas[1]} |`);
}

if (fallas > 0) {
  console.error(`\n${fallas} par(es) no llegan al mínimo.`);
  process.exit(1);
}
