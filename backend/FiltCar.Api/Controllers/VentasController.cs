using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VentasController(AppDbContext db) : ControllerBase
{
    // ── GET /api/ventas ──────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = db.Ventas
            .Include(v => v.Cliente)
            .Include(v => v.Empleado)
            .Include(v => v.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(v =>
                v.Cliente != null && (
                    v.Cliente.Nombre.ToLower().Contains(s) ||
                    v.Cliente.Apellido.ToLower().Contains(s)));
        }

        var result = await query
            .OrderByDescending(v => v.Fecha)
            .Take(300)
            .Select(v => new
            {
                v.Id,
                v.Fecha,
                ClienteNombre = v.Cliente != null
                    ? $"{v.Cliente.Apellido}, {v.Cliente.Nombre}"
                    : null,
                EmpleadoNombre = $"{v.Empleado.Apellido}, {v.Empleado.Nombre}",
                ItemsCount = v.Items.Count,
                v.Total,
                v.Descuento,
                FormaPago = v.FormaPago.ToString(),
                v.MontoPagado,
                v.SaldoPendiente
            })
            .ToListAsync();

        return Ok(result);
    }

    // ── GET /api/ventas/{id} ─────────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var venta = await db.Ventas
            .Include(v => v.Cliente)
            .Include(v => v.Empleado)
            .Include(v => v.Items).ThenInclude(i => i.Articulo)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (venta is null) return NotFound();

        return Ok(new
        {
            venta.Id,
            venta.Fecha,
            Cliente = venta.Cliente is null ? null : new
            {
                venta.Cliente.Id,
                venta.Cliente.Nombre,
                venta.Cliente.Apellido
            },
            Empleado = new { venta.Empleado.Nombre, venta.Empleado.Apellido },
            Items = venta.Items.Select(i => new
            {
                i.Id,
                Articulo = $"{i.Articulo.Marca} {i.Articulo.Modelo}",
                i.Cantidad,
                i.PrecioUnitario,
                i.Subtotal
            }),
            venta.Total,
            venta.Descuento,
            FormaPago = venta.FormaPago.ToString(),
            venta.MontoPagado,
            venta.SaldoPendiente
        });
    }

    // ── POST /api/ventas ─────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] VentaCreateRequest req)
    {
        if (req.Items is null || req.Items.Count == 0)
            return BadRequest(new { message = "La venta debe tener al menos un artículo" });

        var formaPago = Enum.Parse<PaymentMethod>(req.FormaPago);

        if (formaPago == PaymentMethod.Deuda && req.ClienteId is null)
            return BadRequest(new { message = "Se requiere un cliente para ventas en deuda" });

        var empleado = await db.Empleados.FirstOrDefaultAsync(e => e.Username == req.Username);
        if (empleado is null)
            return BadRequest(new { message = "Empleado no encontrado" });

        // ── Build items & validate stock ─────────────────────────────────────
        var ventaItems = new List<VentaItem>();
        decimal subtotal = 0;

        foreach (var itemReq in req.Items)
        {
            var articulo = await db.Articulos.FindAsync(itemReq.ArticuloId);
            if (articulo is null)
                return BadRequest(new { message = $"Artículo #{itemReq.ArticuloId} no encontrado" });
            if (articulo.Stock < itemReq.Cantidad)
                return BadRequest(new { message = $"Stock insuficiente para {articulo.Marca} {articulo.Modelo} (disponible: {articulo.Stock})" });

            var itemSubtotal = articulo.Precio * itemReq.Cantidad;
            subtotal += itemSubtotal;

            ventaItems.Add(new VentaItem
            {
                ArticuloId     = itemReq.ArticuloId,
                Cantidad       = itemReq.Cantidad,
                PrecioUnitario = articulo.Precio,
                Subtotal       = itemSubtotal
            });

            articulo.Stock -= itemReq.Cantidad;
        }

        var total          = subtotal - req.Descuento;
        var montoPagado    = formaPago == PaymentMethod.Deuda ? 0 : total;
        var saldoPendiente = formaPago == PaymentMethod.Deuda ? total : 0;

        // ── Save with transaction ────────────────────────────────────────────
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var venta = new Venta
            {
                ClienteId      = req.ClienteId,
                EmpleadoId     = empleado.Id,
                Fecha          = DateTime.UtcNow,
                Total          = total,
                Descuento      = req.Descuento,
                FormaPago      = formaPago,
                MontoPagado    = montoPagado,
                SaldoPendiente = saldoPendiente,
                Items          = ventaItems
            };

            db.Ventas.Add(venta);
            await db.SaveChangesAsync();

            if (formaPago == PaymentMethod.Deuda)
            {
                db.DeudasClientes.Add(new DeudaCliente
                {
                    ClienteId      = req.ClienteId!.Value,
                    VentaId        = venta.Id,
                    MontoOriginal  = total,
                    MontoPagado    = 0,
                    SaldoPendiente = total,
                    Cancelada      = false,
                    CreadaEn       = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
            }

            await tx.CommitAsync();
            return Ok(new { venta.Id, venta.Total, venta.Fecha });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}

public record VentaItemRequest(int ArticuloId, int Cantidad);

public record VentaCreateRequest(
    int?                  ClienteId,
    string                Username,
    decimal               Descuento,
    string                FormaPago,
    List<VentaItemRequest> Items
);
