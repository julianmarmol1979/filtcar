using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    // GET /api/dashboard
    [HttpGet]
    public async Task<IActionResult> GetResumen()
    {
        var today     = DateTime.UtcNow.Date;
        var todayEnd  = today.AddDays(1).AddTicks(-1);

        var articulosActivos   = await db.Articulos.CountAsync(a => a.Activo);
        var clientesActivos    = await db.Clientes.CountAsync(c => c.Activo);

        // Ventas hoy
        var ventasHoy = await db.Ventas
            .Where(v => v.Fecha >= today && v.Fecha <= todayEnd)
            .ToListAsync();

        // Deudas pendientes (ventas con FormaPago = Deuda)
        var deudas = await db.Ventas
            .Where(v => v.FormaPago == PaymentMethod.Deuda)
            .ToListAsync();

        // Saldo caja: Apertura + Ingreso − Retiro
        var movimientos = await db.CajaMovimientos.ToListAsync();
        var saldoCaja = movimientos.Sum(m => m.Tipo switch
        {
            CajaMovimientoTipo.Apertura => m.Monto,
            CajaMovimientoTipo.Ingreso  => m.Monto,
            CajaMovimientoTipo.Retiro   => -m.Monto,
            _                           => 0m,
        });

        // Presupuestos vigentes
        var presupuestosVigentes = await db.Presupuestos
            .CountAsync(p => p.Vencimiento >= today);

        return Ok(new
        {
            ArticulosActivos    = articulosActivos,
            ClientesActivos     = clientesActivos,
            VentasHoyCantidad   = ventasHoy.Count,
            VentasHoyTotal      = ventasHoy.Sum(v => v.Total),
            DeudasCantidad      = deudas.Count,
            DeudasTotal         = deudas.Sum(v => v.Total),
            SaldoCaja           = saldoCaja,
            PresupuestosVigentes = presupuestosVigentes,
        });
    }
}
