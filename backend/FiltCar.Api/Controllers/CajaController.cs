using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CajaController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var movimientos = await db.CajaMovimientos
            .Include(m => m.Empleado)
            .OrderByDescending(m => m.Fecha)
            .Take(200)
            .Select(m => new
            {
                m.Id,
                m.Fecha,
                Tipo = m.Tipo.ToString(),
                m.Monto,
                m.Observacion,
                Empleado = $"{m.Empleado.Apellido}, {m.Empleado.Nombre}"
            })
            .ToListAsync();

        // Balance: Apertura + Ingreso suman, Retiro resta; Cierre y Arqueo son informativos
        var balance = await db.CajaMovimientos.SumAsync(m =>
            (m.Tipo == CajaMovimientoTipo.Ingreso || m.Tipo == CajaMovimientoTipo.Apertura)
                ? m.Monto
                : m.Tipo == CajaMovimientoTipo.Retiro
                    ? -m.Monto
                    : 0m);

        return Ok(new { movimientos, balance });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CajaMovimientoRequest req)
    {
        var empleado = await db.Empleados.FirstOrDefaultAsync(e => e.Username == req.Username);
        if (empleado is null) return BadRequest(new { message = "Empleado no encontrado" });

        var movimiento = new CajaMovimiento
        {
            Tipo        = Enum.Parse<CajaMovimientoTipo>(req.Tipo),
            Monto       = req.Monto,
            Observacion = req.Observacion?.Trim(),
            EmpleadoId  = empleado.Id,
            Fecha       = DateTime.UtcNow
        };

        db.CajaMovimientos.Add(movimiento);
        await db.SaveChangesAsync();

        return Ok(new
        {
            movimiento.Id,
            movimiento.Fecha,
            Tipo = movimiento.Tipo.ToString(),
            movimiento.Monto,
            movimiento.Observacion,
            Empleado = $"{empleado.Apellido}, {empleado.Nombre}"
        });
    }
}

public record CajaMovimientoRequest(
    string  Tipo,
    decimal Monto,
    string? Observacion,
    string  Username
);
