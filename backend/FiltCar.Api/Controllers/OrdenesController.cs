using FiltCar.Api.Data;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdenesController(AppDbContext db, ActivityLogger logger) : ControllerBase
{
    // Pre-built checklist applied to every new order — general taller checks, not just oil-change related.
    private static readonly string[] ChecklistTemplate =
    [
        "Nivel de aceite de motor",
        "Nivel de líquido refrigerante",
        "Nivel de líquido de frenos",
        "Estado de frenos",
        "Estado de neumáticos",
        "Luces (delanteras, traseras, freno)",
        "Batería",
        "Correas y manguitos",
        "Filtro de aire",
        "Escobillas / limpiaparabrisas",
        "Suspensión / amortiguadores",
        "Sistema de escape",
        "Carrocería (golpes o rayones visibles)",
    ];

    private static readonly string[] EstadosValidos = ["Pendiente", "EnProceso", "Completada", "Cancelada"];

    // GET /api/ordenes?clienteId=&autoId=&estado=&from=&to=&search=
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? clienteId, [FromQuery] int? autoId, [FromQuery] string? estado,
        [FromQuery] string? from, [FromQuery] string? to, [FromQuery] string? search)
    {
        var query = db.OrdenesTrabajo
            .Include(o => o.Cliente)
            .Include(o => o.Auto)
            .Include(o => o.Empleado)
            .AsQueryable();

        if (clienteId is int cid) query = query.Where(o => o.ClienteId == cid);
        if (autoId is int aid) query = query.Where(o => o.AutoId == aid);
        if (!string.IsNullOrWhiteSpace(estado)) query = query.Where(o => o.Estado == estado);
        if (DateOnly.TryParse(from, out var fromDate))
            query = query.Where(o => o.Fecha.Date >= fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).Date);
        if (DateOnly.TryParse(to, out var toDate))
            query = query.Where(o => o.Fecha.Date <= toDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc).Date);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(o =>
                o.Auto.Patente.ToLower().Contains(s) ||
                o.Cliente.Nombre.ToLower().Contains(s) ||
                o.Cliente.Apellido.ToLower().Contains(s) ||
                o.Motivo.ToLower().Contains(s));
        }

        var result = await query
            .OrderByDescending(o => o.Fecha)
            .Select(o => new
            {
                o.Id,
                o.ClienteId,
                Cliente = new { o.Cliente.Nombre, o.Cliente.Apellido, o.Cliente.Telefono },
                o.AutoId,
                Auto = new { o.Auto.Patente, o.Auto.Marca, o.Auto.Modelo },
                o.EmpleadoId,
                Empleado = o.Empleado == null ? null : new { o.Empleado.Nombre, o.Empleado.Apellido },
                o.Fecha,
                o.Estado,
                o.Motivo,
                o.KilometrajeIngreso,
                o.Observaciones,
                o.CreadaEn,
                o.FinalizadaEn,
            })
            .ToListAsync();

        return Ok(result);
    }

    // GET /api/ordenes/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var orden = await db.OrdenesTrabajo
            .Include(o => o.Cliente)
            .Include(o => o.Auto)
            .Include(o => o.Empleado)
            .Include(o => o.ChecklistItems.OrderBy(ci => ci.Posicion))
            .Include(o => o.Items).ThenInclude(i => i.Articulo)
            .Where(o => o.Id == id)
            .Select(o => new
            {
                o.Id,
                o.ClienteId,
                Cliente = new { o.Cliente.Nombre, o.Cliente.Apellido, o.Cliente.Telefono },
                o.AutoId,
                Auto = new { o.Auto.Patente, o.Auto.Marca, o.Auto.Modelo, o.Auto.Anio, o.Auto.Color },
                o.EmpleadoId,
                Empleado = o.Empleado == null ? null : new { o.Empleado.Nombre, o.Empleado.Apellido },
                o.Fecha,
                o.Estado,
                o.Motivo,
                o.KilometrajeIngreso,
                o.Observaciones,
                o.CreadaEn,
                o.FinalizadaEn,
                Checklist = o.ChecklistItems.Select(ci => new { ci.Id, ci.Descripcion, ci.Respuesta, ci.Posicion }),
                Items = o.Items.Select(i => new
                {
                    i.Id,
                    i.ArticuloId,
                    Articulo = $"{i.Articulo.Marca} {i.Articulo.Modelo}",
                    StockDisponible = i.Articulo.Stock,
                    i.Cantidad,
                    i.PrecioUnitario,
                    i.Subtotal
                }),
                Total = o.Items.Sum(i => (decimal?)i.Subtotal) ?? 0,
            })
            .FirstOrDefaultAsync();

        if (orden is null) return NotFound();
        return Ok(orden);
    }

    // POST /api/ordenes
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] OrdenRequest req)
    {
        var cliente = await db.Clientes.FindAsync(req.ClienteId);
        if (cliente is null) return BadRequest(new { message = "Cliente no encontrado" });

        var auto = await db.Autos.FindAsync(req.AutoId);
        if (auto is null || auto.ClienteId != req.ClienteId)
            return BadRequest(new { message = "El vehículo no pertenece a este cliente" });

        var orden = new OrdenTrabajo
        {
            ClienteId          = req.ClienteId,
            AutoId             = req.AutoId,
            EmpleadoId         = req.EmpleadoId,
            Fecha              = (req.Fecha ?? DateTime.UtcNow).ToUniversalTime(),
            Estado             = "Pendiente",
            Motivo             = req.Motivo.Trim(),
            KilometrajeIngreso = req.KilometrajeIngreso,
            Observaciones      = req.Observaciones?.Trim(),
            CreadaEn           = DateTime.UtcNow,
        };

        orden.ChecklistItems = ChecklistTemplate
            .Select((descripcion, i) => new OrdenChecklistItem { Descripcion = descripcion, Posicion = i, Respuesta = null })
            .ToList();

        db.OrdenesTrabajo.Add(orden);
        logger.Log(req.Username, "OrdenCreate", $"Creó una orden de trabajo para \"{auto.Patente}\" ({cliente.Apellido}, {cliente.Nombre})");
        await db.SaveChangesAsync();
        return Ok(new { orden.Id });
    }

    // PUT /api/ordenes/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] OrdenRequest req)
    {
        var orden = await db.OrdenesTrabajo.Include(o => o.Auto).FirstOrDefaultAsync(o => o.Id == id);
        if (orden is null) return NotFound();

        orden.EmpleadoId         = req.EmpleadoId;
        orden.Fecha              = (req.Fecha ?? orden.Fecha).ToUniversalTime();
        orden.Motivo             = req.Motivo.Trim();
        orden.KilometrajeIngreso = req.KilometrajeIngreso;
        orden.Observaciones      = req.Observaciones?.Trim();

        logger.Log(req.Username, "OrdenUpdate", $"Actualizó la orden de trabajo de \"{orden.Auto.Patente}\"");
        await db.SaveChangesAsync();
        return Ok();
    }

    // PATCH /api/ordenes/{id}/estado
    [HttpPatch("{id}/estado")]
    public async Task<IActionResult> UpdateEstado(int id, [FromBody] OrdenEstadoRequest req)
    {
        var orden = await db.OrdenesTrabajo
            .Include(o => o.Auto)
            .Include(o => o.Items).ThenInclude(i => i.Articulo)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (orden is null) return NotFound();

        if (!EstadosValidos.Contains(req.Estado))
            return BadRequest(new { message = "Estado inválido" });

        var yaEstabaCompletada = orden.Estado == "Completada";
        var pasaACompletada    = req.Estado == "Completada" && !yaEstabaCompletada;

        // El stock se descuenta una sola vez, recién en la transición a Completada — nunca al crear/editar items.
        if (pasaACompletada && orden.Items.Count > 0)
        {
            var faltantes = orden.Items
                .Where(i => i.Articulo.Stock < i.Cantidad)
                .Select(i => $"{i.Articulo.Marca} {i.Articulo.Modelo} (disponible: {i.Articulo.Stock}, requerido: {i.Cantidad})")
                .ToList();

            if (faltantes.Count > 0)
                return BadRequest(new { message = $"Stock insuficiente para completar la orden: {string.Join("; ", faltantes)}" });
        }

        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            if (pasaACompletada)
            {
                foreach (var item in orden.Items)
                    item.Articulo.Stock -= item.Cantidad;
            }

            orden.Estado = req.Estado;
            orden.FinalizadaEn = req.Estado is "Completada" or "Cancelada" ? DateTime.UtcNow : null;

            logger.Log(req.Username, "OrdenEstado", $"Cambió la orden de \"{orden.Auto.Patente}\" a {req.Estado}");
            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok();
        }
        catch (DbUpdateConcurrencyException)
        {
            await tx.RollbackAsync();
            return Conflict(new { message = "El stock de un artículo cambió mientras se completaba la orden. Refrescá la orden y volvé a intentar." });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    // PUT /api/ordenes/{id}/items
    [HttpPut("{id}/items")]
    public async Task<IActionResult> UpdateItems(int id, [FromBody] OrdenItemsUpdateRequest req)
    {
        var orden = await db.OrdenesTrabajo
            .Include(o => o.Auto)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (orden is null) return NotFound();

        if (orden.Estado is "Completada" or "Cancelada")
            return BadRequest(new { message = "No se pueden modificar los artículos de una orden cerrada" });

        db.OrdenItems.RemoveRange(orden.Items);

        var nuevosItems = new List<OrdenItem>();
        foreach (var itemReq in req.Items)
        {
            if (itemReq.Cantidad < 1)
                return BadRequest(new { message = "La cantidad debe ser al menos 1" });

            var articulo = await db.Articulos.FindAsync(itemReq.ArticuloId);
            if (articulo is null)
                return BadRequest(new { message = $"Artículo #{itemReq.ArticuloId} no encontrado" });

            nuevosItems.Add(new OrdenItem
            {
                ArticuloId     = articulo.Id,
                Cantidad       = itemReq.Cantidad,
                PrecioUnitario = articulo.Precio,
                Subtotal       = articulo.Precio * itemReq.Cantidad
            });
        }

        orden.Items = nuevosItems;
        logger.Log(req.Username, "OrdenItemsUpdate", $"Actualizó los artículos de la orden de \"{orden.Auto.Patente}\"");
        await db.SaveChangesAsync();
        return Ok();
    }

    // PATCH /api/ordenes/{id}/checklist
    [HttpPatch("{id}/checklist")]
    public async Task<IActionResult> UpdateChecklist(int id, [FromBody] ChecklistUpdateRequest req)
    {
        var orden = await db.OrdenesTrabajo
            .Include(o => o.Auto)
            .Include(o => o.ChecklistItems)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (orden is null) return NotFound();

        foreach (var itemReq in req.Items)
        {
            var item = orden.ChecklistItems.FirstOrDefault(ci => ci.Id == itemReq.Id);
            if (item is not null) item.Respuesta = itemReq.Respuesta;
        }

        logger.Log(req.Username, "OrdenChecklistUpdate", $"Actualizó el checklist de la orden de \"{orden.Auto.Patente}\"");
        await db.SaveChangesAsync();
        return Ok();
    }

    // DELETE /api/ordenes/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] string? username)
    {
        var orden = await db.OrdenesTrabajo.Include(o => o.Auto).FirstOrDefaultAsync(o => o.Id == id);
        if (orden is null) return NotFound();

        logger.Log(username, "OrdenDelete", $"Eliminó la orden de trabajo de \"{orden.Auto.Patente}\"");
        db.OrdenesTrabajo.Remove(orden);
        await db.SaveChangesAsync();
        return Ok();
    }
}

public record OrdenRequest(
    int       ClienteId,
    int       AutoId,
    int?      EmpleadoId,
    DateTime? Fecha,
    string    Motivo,
    int?      KilometrajeIngreso,
    string?   Observaciones,
    string?   Username = null
);

public record OrdenEstadoRequest(string Estado, string? Username = null);

public record ChecklistItemUpdate(int Id, bool? Respuesta);

public record ChecklistUpdateRequest(List<ChecklistItemUpdate> Items, string? Username = null);

public record OrdenItemRequest(int ArticuloId, int Cantidad);

public record OrdenItemsUpdateRequest(List<OrdenItemRequest> Items, string? Username = null);
