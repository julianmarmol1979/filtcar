using FiltCar.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InformesController(AppDbContext db) : ControllerBase
{
    // GET /api/informes/resumen?desde=2026-05-01&hasta=2026-05-31
    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen([FromQuery] DateTime desde, [FromQuery] DateTime hasta)
    {
        var desdeUtc = new DateTime(desde.Year, desde.Month, desde.Day, 0, 0, 0, DateTimeKind.Utc);
        var hastaUtc = new DateTime(hasta.Year, hasta.Month, hasta.Day, 23, 59, 59, DateTimeKind.Utc);

        var ventas = await db.Ventas
            .Where(v => v.Fecha >= desdeUtc && v.Fecha <= hastaUtc)
            .ToListAsync();

        var compras = await db.Compras
            .Where(c => c.Fecha >= desdeUtc && c.Fecha <= hastaUtc)
            .ToListAsync();

        var totalVentas     = ventas.Sum(v => v.Total);
        var cantidadVentas  = ventas.Count;
        var totalCompras    = compras.Sum(c => c.Total);
        var cantidadCompras = compras.Count;

        var ventasPorFormaPago = ventas
            .GroupBy(v => v.FormaPago.ToString())
            .Select(g => new
            {
                FormaPago = g.Key,
                Total     = g.Sum(v => v.Total),
                Cantidad  = g.Count(),
            })
            .OrderByDescending(x => x.Total)
            .ToList();

        return Ok(new
        {
            TotalVentas      = totalVentas,
            CantidadVentas   = cantidadVentas,
            TicketPromedio   = cantidadVentas > 0 ? Math.Round(totalVentas / cantidadVentas, 2) : 0m,
            TotalCompras     = totalCompras,
            CantidadCompras  = cantidadCompras,
            VentasPorFormaPago = ventasPorFormaPago,
        });
    }

    // GET /api/informes/ventas-por-dia?desde=2026-05-01&hasta=2026-05-31
    [HttpGet("ventas-por-dia")]
    public async Task<IActionResult> GetVentasPorDia([FromQuery] DateTime desde, [FromQuery] DateTime hasta)
    {
        var desdeUtc = new DateTime(desde.Year, desde.Month, desde.Day, 0, 0, 0, DateTimeKind.Utc);
        var hastaUtc = new DateTime(hasta.Year, hasta.Month, hasta.Day, 23, 59, 59, DateTimeKind.Utc);

        var ventas = await db.Ventas
            .Where(v => v.Fecha >= desdeUtc && v.Fecha <= hastaUtc)
            .Select(v => new { v.Fecha, v.Total })
            .ToListAsync();

        var result = ventas
            .GroupBy(v => v.Fecha.Date)
            .Select(g => new
            {
                Fecha    = g.Key.ToString("yyyy-MM-dd"),
                Total    = g.Sum(v => v.Total),
                Cantidad = g.Count(),
            })
            .OrderBy(x => x.Fecha)
            .ToList();

        return Ok(result);
    }

    // GET /api/informes/top-articulos?desde=2026-05-01&hasta=2026-05-31&top=10
    [HttpGet("top-articulos")]
    public async Task<IActionResult> GetTopArticulos(
        [FromQuery] DateTime desde,
        [FromQuery] DateTime hasta,
        [FromQuery] int top = 10)
    {
        var desdeUtc = new DateTime(desde.Year, desde.Month, desde.Day, 0, 0, 0, DateTimeKind.Utc);
        var hastaUtc = new DateTime(hasta.Year, hasta.Month, hasta.Day, 23, 59, 59, DateTimeKind.Utc);

        var result = await db.VentaItems
            .Where(vi => vi.Venta.Fecha >= desdeUtc && vi.Venta.Fecha <= hastaUtc)
            .GroupBy(vi => new { vi.ArticuloId, vi.Articulo.Marca, vi.Articulo.Modelo })
            .Select(g => new
            {
                Articulo         = g.Key.Marca + " " + g.Key.Modelo,
                UnidadesVendidas = g.Sum(vi => vi.Cantidad),
                TotalVendido     = g.Sum(vi => vi.Subtotal),
            })
            .OrderByDescending(x => x.UnidadesVendidas)
            .Take(top)
            .ToListAsync();

        return Ok(result);
    }

    // GET /api/informes/stock-bajo?umbral=5
    [HttpGet("stock-bajo")]
    public async Task<IActionResult> GetStockBajo([FromQuery] int umbral = 5)
    {
        var result = await db.Articulos
            .Where(a => a.Activo && a.Stock <= umbral)
            .OrderBy(a => a.Stock)
            .Select(a => new { a.Id, a.Marca, a.Modelo, a.Stock })
            .ToListAsync();

        return Ok(result);
    }
}
