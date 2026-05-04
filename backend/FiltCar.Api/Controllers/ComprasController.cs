using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ComprasController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await db.Compras
            .Include(c => c.Proveedor)
            .Include(c => c.Empleado)
            .Include(c => c.Items)
            .OrderByDescending(c => c.Fecha)
            .Take(200)
            .Select(c => new
            {
                c.Id,
                c.Fecha,
                Proveedor = c.Proveedor.Nombre,
                Empleado  = $"{c.Empleado.Apellido}, {c.Empleado.Nombre}",
                ItemsCount = c.Items.Count,
                c.Total,
                c.PagoInmediato,
                c.MontoPagado,
                c.SaldoPendiente,
                c.Cancelada
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var compra = await db.Compras
            .Include(c => c.Proveedor)
            .Include(c => c.Empleado)
            .Include(c => c.Items).ThenInclude(i => i.Articulo)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (compra is null) return NotFound();

        return Ok(new
        {
            compra.Id,
            compra.Fecha,
            Proveedor = new { compra.Proveedor.Id, compra.Proveedor.Nombre },
            Empleado  = new { compra.Empleado.Nombre, compra.Empleado.Apellido },
            Items = compra.Items.Select(i => new
            {
                i.Id,
                Articulo = $"{i.Articulo.Marca} {i.Articulo.Modelo}",
                i.Cantidad,
                i.PrecioUnitario,
                i.Subtotal
            }),
            compra.Total,
            compra.PagoInmediato,
            compra.MontoPagado,
            compra.SaldoPendiente,
            compra.Cancelada
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CompraCreateRequest req)
    {
        if (req.Items is null || req.Items.Count == 0)
            return BadRequest(new { message = "La compra debe tener al menos un artículo" });

        var empleado = await db.Empleados.FirstOrDefaultAsync(e => e.Username == req.Username);
        if (empleado is null) return BadRequest(new { message = "Empleado no encontrado" });

        var proveedor = await db.Proveedores.FindAsync(req.ProveedorId);
        if (proveedor is null) return BadRequest(new { message = "Proveedor no encontrado" });

        var compraItems = new List<CompraItem>();
        decimal total = 0;

        foreach (var itemReq in req.Items)
        {
            var articulo = await db.Articulos.FindAsync(itemReq.ArticuloId);
            if (articulo is null)
                return BadRequest(new { message = $"Artículo #{itemReq.ArticuloId} no encontrado" });

            var subtotal = itemReq.PrecioUnitario * itemReq.Cantidad;
            total += subtotal;

            compraItems.Add(new CompraItem
            {
                ArticuloId     = itemReq.ArticuloId,
                Cantidad       = itemReq.Cantidad,
                PrecioUnitario = itemReq.PrecioUnitario,
                Subtotal       = subtotal
            });

            // Increase stock
            articulo.Stock += itemReq.Cantidad;
        }

        var montoPagado    = req.PagoInmediato ? total : 0;
        var saldoPendiente = req.PagoInmediato ? 0 : total;

        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var compra = new Compra
            {
                ProveedorId    = req.ProveedorId,
                EmpleadoId     = empleado.Id,
                Fecha          = DateTime.UtcNow,
                Total          = total,
                PagoInmediato  = req.PagoInmediato,
                MontoPagado    = montoPagado,
                SaldoPendiente = saldoPendiente,
                Cancelada      = false,
                Items          = compraItems
            };

            db.Compras.Add(compra);
            await db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new { compra.Id, compra.Total, compra.Fecha });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}

public record CompraItemRequest(int ArticuloId, int Cantidad, decimal PrecioUnitario);

public record CompraCreateRequest(
    int  ProveedorId,
    string Username,
    bool PagoInmediato,
    List<CompraItemRequest> Items
);
