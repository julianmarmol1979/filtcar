using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DeudasController(AppDbContext db) : ControllerBase
{
    // ── GET /api/deudas ──────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await db.DeudasClientes
            .Include(d => d.Cliente)
            .Include(d => d.Venta)
            .Where(d => !d.Cancelada)
            .OrderByDescending(d => d.CreadaEn)
            .Select(d => new
            {
                d.Id,
                d.CreadaEn,
                Cliente = new
                {
                    d.Cliente.Id,
                    d.Cliente.Nombre,
                    d.Cliente.Apellido,
                    d.Cliente.Telefono
                },
                d.VentaId,
                VentaFecha     = d.Venta.Fecha,
                d.MontoOriginal,
                d.MontoPagado,
                d.SaldoPendiente
            })
            .ToListAsync();

        return Ok(result);
    }

    // ── POST /api/deudas/{id}/pagar ──────────────────────────────────────────
    [HttpPost("{id}/pagar")]
    public async Task<IActionResult> Pagar(int id, [FromBody] PagoDeudaRequest req)
    {
        var deuda = await db.DeudasClientes
            .Include(d => d.Venta)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (deuda is null)     return NotFound();
        if (deuda.Cancelada)   return BadRequest(new { message = "La deuda ya está cancelada" });
        if (req.Monto <= 0)    return BadRequest(new { message = "El monto debe ser mayor a cero" });
        if (req.Monto > deuda.SaldoPendiente)
            return BadRequest(new { message = $"El monto supera el saldo pendiente (${deuda.SaldoPendiente:N2})" });

        var empleado = await db.Empleados.FirstOrDefaultAsync(e => e.Username == req.Username);
        if (empleado is null)  return BadRequest(new { message = "Empleado no encontrado" });

        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            db.PagosDeudaCliente.Add(new PagoDeudaCliente
            {
                DeudaClienteId = deuda.Id,
                Monto          = req.Monto,
                Fecha          = DateTime.UtcNow,
                EmpleadoId     = empleado.Id
            });

            deuda.MontoPagado    += req.Monto;
            deuda.SaldoPendiente -= req.Monto;
            deuda.Cancelada       = deuda.SaldoPendiente <= 0;

            deuda.Venta.MontoPagado    += req.Monto;
            deuda.Venta.SaldoPendiente -= req.Monto;

            await db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                deuda.MontoPagado,
                deuda.SaldoPendiente,
                deuda.Cancelada
            });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}

public record PagoDeudaRequest(decimal Monto, string Username);
