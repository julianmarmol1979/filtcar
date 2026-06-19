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

    // GET /api/dashboard/charts
    [HttpGet("charts")]
    public async Task<IActionResult> GetCharts()
    {
        var now        = DateTime.UtcNow;
        var sixMonthsAgo = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-5);

        // Ventas por mes (last 6 months)
        var ventasPorMes = await db.Ventas
            .Where(v => v.Fecha >= sixMonthsAgo)
            .GroupBy(v => new { v.Fecha.Year, v.Fecha.Month })
            .Select(g => new
            {
                Year  = g.Key.Year,
                Month = g.Key.Month,
                Total = g.Sum(v => v.Total),
                Count = g.Count(),
            })
            .OrderBy(g => g.Year).ThenBy(g => g.Month)
            .ToListAsync();

        // Top 5 artículos por cantidad vendida (all time)
        var topArticulos = await db.VentaItems
            .GroupBy(i => i.Articulo.Nombre)
            .Select(g => new
            {
                Nombre   = g.Key,
                Cantidad = g.Sum(i => i.Cantidad),
                Total    = g.Sum(i => i.Subtotal),
            })
            .OrderByDescending(g => g.Cantidad)
            .Take(5)
            .ToListAsync();

        var meses = new[] { "", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };

        return Ok(new
        {
            VentasPorMes = ventasPorMes.Select(v => new
            {
                Mes   = meses[v.Month] + " " + v.Year.ToString()[2..],
                Total = v.Total,
                Count = v.Count,
            }),
            TopArticulos = topArticulos,
        });
    }
}
