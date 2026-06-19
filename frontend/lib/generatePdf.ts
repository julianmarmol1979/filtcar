import type { jsPDF as JsPDFType } from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface VentaDetalleForPdf {
  id: number;
  fecha: string;
  cliente: { nombre: string; apellido: string } | null;
  empleado: { nombre: string; apellido: string };
  items: { articulo: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  total: number;
  descuento: number;
  formaPago: string;
  saldoPendiente: number;
}

export interface PresupuestoDetalleForPdf {
  id: number;
  fecha: string;
  vencimiento: string;
  cliente: { nombre: string; apellido: string } | null;
  empleado: { nombre: string; apellido: string };
  items: { articulo: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  total: number;
  observacion: string | null;
  vencido: boolean;
}

// ─── Layout constants (mm, A4 = 210x297) ─────────────────────────────────────
const ML  = 15;   // left margin
const MR  = 195;  // right edge (210 - 15)
const CW  = 180;  // content width

// Items table column positions
const C_ART = ML;   // article text starts here
const C_QTY = 120;  // quantity centered here
const C_PU  = 170;  // unit price right-aligned here
const C_SUB = MR;   // subtotal right-aligned here

// ─── Formatters ───────────────────────────────────────────────────────────────
function money(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2 });
}
function dateStr(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}
function datetimeStr(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  );
}

const FORMA_PAGO: Record<string, string> = {
  Contado: "Contado", Tarjeta: "Tarjeta", Deposito: "Deposito", Deuda: "Deuda",
};

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function drawHeader(doc: JsPDFType, title: string, subtitle: string): number {
  const y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text("FiltCar Lubricentro", ML, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("Filtros y Lubricantes", ML, y + 6);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(ML, y + 11, MR, y + 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text(title, 105, y + 20, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(subtitle, 105, y + 27, { align: "center" });

  return y + 35;
}

function drawInfoRow(doc: JsPDFType, label: string, value: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(label + ":", ML, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(17, 24, 39);
  doc.text(value, ML + 38, y);
}

function drawDivider(doc: JsPDFType, y: number) {
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(ML, y, MR, y);
}

function drawItemsTable(
  doc: JsPDFType,
  items: { articulo: string; cantidad: number; precioUnitario: number; subtotal: number }[],
  y: number
): number {
  // Header background
  doc.setFillColor(249, 250, 251);
  doc.rect(ML, y - 4, CW, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text("Articulo",     C_ART, y);
  doc.text("Cant.",        C_QTY, y, { align: "center" });
  doc.text("Precio Unit.", C_PU,  y, { align: "right" });
  doc.text("Subtotal",     C_SUB, y, { align: "right" });

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(ML, y + 2, MR, y + 2);

  let ry = y + 8;
  items.forEach((item, i) => {
    const art =
      item.articulo.length > 54
        ? item.articulo.slice(0, 51) + "..."
        : item.articulo;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
    doc.text(art, C_ART, ry);

    doc.setTextColor(75, 85, 99);
    doc.text(String(item.cantidad), C_QTY, ry, { align: "center" });
    doc.text(money(item.precioUnitario), C_PU, ry, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(money(item.subtotal), C_SUB, ry, { align: "right" });

    if (i < items.length - 1) {
      doc.setDrawColor(243, 244, 246);
      doc.setLineWidth(0.2);
      doc.line(ML, ry + 2.5, MR, ry + 2.5);
    }
    ry += 7;
  });

  return ry + 2;
}

function drawTotals(doc: JsPDFType, total: number, descuento: number, y: number): number {
  drawDivider(doc, y);
  let ty = y + 6;

  if (descuento > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text("Subtotal:", MR - 55, ty);
    doc.text(money(total + descuento), MR, ty, { align: "right" });
    ty += 5.5;

    doc.setTextColor(185, 28, 28);
    doc.text("Descuento:", MR - 55, ty);
    doc.text("- " + money(descuento), MR, ty, { align: "right" });
    ty += 4;

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(MR - 60, ty, MR, ty);
    ty += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text("TOTAL:", MR - 55, ty);
  doc.text(money(total), MR, ty, { align: "right" });

  return ty + 8;
}

function drawStatusBadge(doc: JsPDFType, text: string, positive: boolean, y: number) {
  if (positive) {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(21, 128, 61);
  } else {
    doc.setFillColor(254, 226, 226);
    doc.setTextColor(185, 28, 28);
  }
  doc.roundedRect(ML, y, CW, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(text, 105, y + 6.5, { align: "center" });
}

function drawFooter(doc: JsPDFType) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "Generado por FiltCar Lubricentro  -  " + datetimeStr(new Date().toISOString()),
    105,
    287,
    { align: "center" }
  );
}

// ─── Public functions ─────────────────────────────────────────────────────────
export async function generateVentaPdf(d: VentaDetalleForPdf) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawHeader(doc, "COMPROBANTE DE VENTA", `Venta N ${d.id}  -  ${datetimeStr(d.fecha)}`);

  y += 2;
  drawInfoRow(doc, "Cliente",       d.cliente ? `${d.cliente.apellido}, ${d.cliente.nombre}` : "Mostrador", y);
  y += 6;
  drawInfoRow(doc, "Vendedor",      `${d.empleado.apellido}, ${d.empleado.nombre}`, y);
  y += 6;
  drawInfoRow(doc, "Forma de pago", FORMA_PAGO[d.formaPago] ?? d.formaPago, y);
  y += 10;

  drawDivider(doc, y);
  y += 7;

  y = drawItemsTable(doc, d.items, y);
  y += 2;
  y = drawTotals(doc, d.total, d.descuento, y);
  y += 4;

  const paid = d.saldoPendiente <= 0;
  drawStatusBadge(
    doc,
    paid ? "PAGADO" : `SALDO PENDIENTE: ${money(d.saldoPendiente)}`,
    paid,
    y
  );

  drawFooter(doc);
  doc.save(`venta-${d.id}.pdf`);
}

export async function generatePresupuestoPdf(d: PresupuestoDetalleForPdf) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ── Blue header band ──────────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 36, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("FILT-CAR Lubricentro", ML, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(147, 197, 253);
  doc.text("Filtros · Lubricantes · Aceites", ML, 23);
  doc.text("Tel: (0291) 000-0000  |  filtcar@ejemplo.com", ML, 28);

  // Presupuesto label at right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("PRESUPUESTO", MR, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(147, 197, 253);
  doc.text(`N° ${d.id}`, MR, 20, { align: "right" });
  doc.text(`Fecha: ${dateStr(d.fecha)}`, MR, 26, { align: "right" });

  let y = 46;

  // ── Two-column info block ─────────────────────────────────────────────────
  const midX = 105 + 5;
  const rightColX = midX + 5;

  // Left: client info box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(ML, y, 86, 26, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, 86, 26, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("CLIENTE", ML + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  const clientName = d.cliente
    ? `${d.cliente.apellido}, ${d.cliente.nombre}`
    : "Consumidor final";
  doc.text(clientName, ML + 4, y + 13);

  // Right: validity box
  doc.setFillColor(d.vencido ? 254 : 240, d.vencido ? 242 : 253, d.vencido ? 242 : 244);
  doc.roundedRect(rightColX, y, 80, 26, 2, 2, "F");
  doc.setDrawColor(d.vencido ? 252 : 167, d.vencido ? 165 : 243, d.vencido ? 165 : 208);
  doc.roundedRect(rightColX, y, 80, 26, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("VÁLIDO HASTA", rightColX + 4, y + 5);
  doc.setFontSize(12);
  doc.setTextColor(d.vencido ? 185 : 5, d.vencido ? 28 : 150, d.vencido ? 28 : 105);
  doc.text(dateStr(d.vencimiento), rightColX + 4, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Asesor: ${d.empleado.apellido}, ${d.empleado.nombre}`, rightColX + 4, y + 22);

  y += 34;

  // ── Observacion ───────────────────────────────────────────────────────────
  if (d.observacion) {
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(ML, y, CW, 9, 1.5, 1.5, "F");
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(ML, y, CW, 9, 1.5, 1.5, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text("Nota:", ML + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(92, 45, 8);
    doc.text(d.observacion.slice(0, 120), ML + 18, y + 6);
    y += 14;
  } else {
    y += 4;
  }

  // ── Items table ───────────────────────────────────────────────────────────
  y = drawItemsTable(doc, d.items, y);
  y += 4;

  // ── Totals box ────────────────────────────────────────────────────────────
  doc.setFillColor(30, 64, 175);
  doc.roundedRect(MR - 65, y, 65, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", MR - 61, y + 9);
  doc.setFontSize(12);
  doc.text(money(d.total), MR - 2, y + 9, { align: "right" });
  y += 22;

  // ── Status banner ─────────────────────────────────────────────────────────
  drawStatusBadge(
    doc,
    d.vencido ? "⚠  PRESUPUESTO VENCIDO" : "✓  PRESUPUESTO VIGENTE",
    !d.vencido,
    y
  );
  y += 16;

  // ── Terms ─────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text("Los precios quedan sujetos a disponibilidad de stock y variaciones en el tipo de cambio.", 105, y, { align: "center" });
  doc.text("Este presupuesto no constituye factura.", 105, y + 4.5, { align: "center" });

  drawFooter(doc);
  doc.save(`presupuesto-${d.id}.pdf`);
}
