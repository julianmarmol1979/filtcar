using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PresupuestosController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var now = DateTime.UtcNow;
        var result = await db.Presupuestos
            .Include(p => p.Cliente)
            .Include(p => p.Empleado)
            .Include(p => p.Items)
            .OrderByDescending(p => p.Fecha)
            .Take(200)
            .Select(p => new
            {
                p.Id,
                p.Fecha,
                p.Vencimiento,
                ClienteNombre = p.Cliente != null ? $"{p.Cliente.Apellido}, {p.Cliente.Nombre}" : null,
                Empleado      = $"{p.Empleado.Apellido}, {p.Empleado.Nombre}",
                ItemsCount    = p.Items.Count,
                p.Total,
                p.Observacion,
                Vencido       = p.Vencimiento < now
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var presupuesto = await db.Presupuestos
            .Include(p => p.Cliente)
            .Include(p => p.Empleado)
            .Include(p => p.Items).ThenInclude(i => i.Articulo)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (presupuesto is null) return NotFound();

        return Ok(new
        {
            presupuesto.Id,
            presupuesto.Fecha,
            presupuesto.Vencimiento,
            ClienteId = presupuesto.ClienteId,
            Cliente  = presupuesto.Cliente is null ? null : new { presupuesto.Cliente.Nombre, presupuesto.Cliente.Apellido },
            Empleado = new { presupuesto.Empleado.Nombre, presupuesto.Empleado.Apellido },
            Items = presupuesto.Items.Select(i => new
            {
                i.Id,
                i.ArticuloId,
                Articulo = $"{i.Articulo.Marca} {i.Articulo.Modelo}",
                Stock    = i.Articulo.Stock,
                i.Cantidad,
                i.PrecioUnitario,
                i.Subtotal
            }),
            presupuesto.Total,
            presupuesto.Observacion,
            Vencido = presupuesto.Vencimiento < DateTime.UtcNow
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PresupuestoCreateRequest req)
    {
        if (req.Items is null || req.Items.Count == 0)
            return BadRequest(new { message = "El presupuesto debe tener al menos un artículo" });

        var empleado = await db.Empleados.FirstOrDefaultAsync(e => e.Username == req.Username);
        if (empleado is null) return BadRequest(new { message = "Empleado no encontrado" });

        var presItems = new List<PresupuestoItem>();
        decimal total = 0;

        foreach (var itemReq in req.Items)
        {
            var articulo = await db.Articulos.FindAsync(itemReq.ArticuloId);
            if (articulo is null)
                return BadRequest(new { message = $"Artículo #{itemReq.ArticuloId} no encontrado" });

            var subtotal = articulo.Precio * itemReq.Cantidad;
            total += subtotal;

            presItems.Add(new PresupuestoItem
            {
                ArticuloId     = itemReq.ArticuloId,
                Cantidad       = itemReq.Cantidad,
                PrecioUnitario = articulo.Precio,
                Subtotal       = subtotal
            });
        }

        var presupuesto = new Presupuesto
        {
            ClienteId   = req.ClienteId,
            EmpleadoId  = empleado.Id,
            Fecha       = DateTime.UtcNow,
            Vencimiento = req.Vencimiento.ToUniversalTime(),
            Total       = total,
            Observacion = req.Observacion?.Trim(),
            Items       = presItems
        };

        db.Presupuestos.Add(presupuesto);
        await db.SaveChangesAsync();

        return Ok(new { presupuesto.Id, presupuesto.Total, presupuesto.Fecha });
    }
}

public record PresupuestoItemRequest(int ArticuloId, int Cantidad);

public record PresupuestoCreateRequest(
    int?      ClienteId,
    string    Username,
    DateTime  Vencimiento,
    string?   Observacion,
    List<PresupuestoItemRequest> Items
);
