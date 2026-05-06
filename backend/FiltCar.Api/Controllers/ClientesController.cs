using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClientesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = db.Clientes.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(c =>
                c.Nombre.ToLower().Contains(s) ||
                c.Apellido.ToLower().Contains(s) ||
                (c.Telefono != null && c.Telefono.Contains(s)) ||
                (c.Email != null && c.Email.ToLower().Contains(s)));
        }

        var result = await query
            .OrderBy(c => c.Apellido).ThenBy(c => c.Nombre)
            .Select(c => new
            {
                c.Id,
                c.Nombre,
                c.Apellido,
                c.Telefono,
                c.Email,
                c.Direccion,
                c.Activo,
                c.CreadoEn
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ClienteRequest req)
    {
        var cliente = new Cliente
        {
            Nombre    = req.Nombre.Trim(),
            Apellido  = req.Apellido.Trim(),
            Telefono  = req.Telefono?.Trim(),
            Email     = req.Email?.Trim().ToLower(),
            Direccion = req.Direccion?.Trim(),
            Activo    = true,
            CreadoEn  = DateTime.UtcNow
        };

        db.Clientes.Add(cliente);
        await db.SaveChangesAsync();
        return Ok(cliente);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ClienteRequest req)
    {
        var cliente = await db.Clientes.FindAsync(id);
        if (cliente is null) return NotFound();

        cliente.Nombre    = req.Nombre.Trim();
        cliente.Apellido  = req.Apellido.Trim();
        cliente.Telefono  = req.Telefono?.Trim();
        cliente.Email     = req.Email?.Trim().ToLower();
        cliente.Direccion = req.Direccion?.Trim();

        await db.SaveChangesAsync();
        return Ok(cliente);
    }

    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(int id)
    {
        var cliente = await db.Clientes.FindAsync(id);
        if (cliente is null) return NotFound();

        cliente.Activo = !cliente.Activo;
        await db.SaveChangesAsync();
        return Ok(new { cliente.Id, cliente.Activo });
    }

    // ── GET /api/clientes/{id}/historial ────────────────────────────────────
    [HttpGet("{id}/historial")]
    public async Task<IActionResult> Historial(int id)
    {
        var cliente = await db.Clientes.FindAsync(id);
        if (cliente is null) return NotFound();

        var ventas = await db.Ventas
            .Include(v => v.Items)
            .Where(v => v.ClienteId == id)
            .OrderByDescending(v => v.Fecha)
            .Select(v => new
            {
                v.Id,
                v.Fecha,
                v.Total,
                v.Descuento,
                FormaPago      = v.FormaPago.ToString(),
                v.SaldoPendiente,
                ItemsCount     = v.Items.Count
            })
            .ToListAsync();

        var presupuestos = await db.Presupuestos
            .Include(p => p.Items)
            .Where(p => p.ClienteId == id)
            .OrderByDescending(p => p.Fecha)
            .Select(p => new
            {
                p.Id,
                p.Fecha,
                p.Vencimiento,
                p.Total,
                ItemsCount = p.Items.Count,
                Vencido    = p.Vencimiento < DateTime.UtcNow
            })
            .ToListAsync();

        return Ok(new { ventas, presupuestos });
    }
}

public record ClienteRequest(
    string Nombre,
    string Apellido,
    string? Telefono,
    string? Email,
    string? Direccion
);
