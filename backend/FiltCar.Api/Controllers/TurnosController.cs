using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TurnosController(AppDbContext db) : ControllerBase
{
    // GET /api/turnos?from=2026-05-06&to=2026-05-12
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? from, [FromQuery] string? to)
    {
        var query = db.Turnos
            .Include(t => t.Cliente)
            .Include(t => t.Empleado)
            .AsQueryable();

        if (DateOnly.TryParse(from, out var fromDate))
            query = query.Where(t => t.Fecha.Date >= fromDate.ToDateTime(TimeOnly.MinValue).Date);

        if (DateOnly.TryParse(to, out var toDate))
            query = query.Where(t => t.Fecha.Date <= toDate.ToDateTime(TimeOnly.MaxValue).Date);

        var turnos = await query
            .OrderBy(t => t.Fecha)
            .Select(t => new
            {
                t.Id,
                Fecha      = t.Fecha,
                t.ClienteNombre,
                ClienteId  = t.ClienteId,
                Cliente    = t.Cliente == null ? null : new { t.Cliente.Nombre, t.Cliente.Apellido, t.Cliente.Telefono },
                t.Telefono,
                t.Vehiculo,
                t.Servicio,
                t.Observacion,
                EmpleadoId = t.EmpleadoId,
                Empleado   = t.Empleado == null ? null : new { t.Empleado.Nombre, t.Empleado.Apellido },
                t.Estado,
                t.CreadaEn,
            })
            .ToListAsync();

        return Ok(turnos);
    }

    // POST /api/turnos
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TurnoRequest req)
    {
        var turno = new Turno
        {
            Fecha         = req.Fecha.ToUniversalTime(),
            ClienteNombre = req.ClienteNombre,
            ClienteId     = req.ClienteId,
            Telefono      = req.Telefono,
            Vehiculo      = req.Vehiculo,
            Servicio      = req.Servicio,
            Observacion   = req.Observacion,
            EmpleadoId    = req.EmpleadoId,
            Estado        = "Pendiente",
            CreadaEn      = DateTime.UtcNow,
        };
        db.Turnos.Add(turno);
        await db.SaveChangesAsync();
        return Ok(new { turno.Id });
    }

    // PUT /api/turnos/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TurnoRequest req)
    {
        var turno = await db.Turnos.FindAsync(id);
        if (turno is null) return NotFound();

        turno.Fecha         = req.Fecha.ToUniversalTime();
        turno.ClienteNombre = req.ClienteNombre;
        turno.ClienteId     = req.ClienteId;
        turno.Telefono      = req.Telefono;
        turno.Vehiculo      = req.Vehiculo;
        turno.Servicio      = req.Servicio;
        turno.Observacion   = req.Observacion;
        turno.EmpleadoId    = req.EmpleadoId;

        await db.SaveChangesAsync();
        return Ok();
    }

    // PATCH /api/turnos/{id}/estado
    [HttpPatch("{id:int}/estado")]
    public async Task<IActionResult> UpdateEstado(int id, [FromBody] EstadoRequest req)
    {
        var turno = await db.Turnos.FindAsync(id);
        if (turno is null) return NotFound();

        var valid = new[] { "Pendiente", "Confirmado", "Completado", "Cancelado" };
        if (!valid.Contains(req.Estado))
            return BadRequest(new { message = "Estado inválido" });

        turno.Estado = req.Estado;
        await db.SaveChangesAsync();
        return Ok();
    }

    // DELETE /api/turnos/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var turno = await db.Turnos.FindAsync(id);
        if (turno is null) return NotFound();
        db.Turnos.Remove(turno);
        await db.SaveChangesAsync();
        return Ok();
    }
}

public record TurnoRequest(
    DateTime Fecha,
    string?  ClienteNombre,
    int?     ClienteId,
    string?  Telefono,
    string?  Vehiculo,
    string   Servicio,
    string?  Observacion,
    int?     EmpleadoId
);

public record EstadoRequest(string Estado);
