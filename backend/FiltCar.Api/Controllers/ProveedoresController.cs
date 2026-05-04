using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProveedoresController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = db.Proveedores.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(p =>
                p.Nombre.ToLower().Contains(s) ||
                (p.Contacto != null && p.Contacto.ToLower().Contains(s)) ||
                (p.Telefono != null && p.Telefono.Contains(s)) ||
                (p.Email != null && p.Email.ToLower().Contains(s)));
        }

        var result = await query
            .OrderBy(p => p.Nombre)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Contacto,
                p.Telefono,
                p.Email,
                p.Activo,
                p.CreadoEn
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProveedorRequest req)
    {
        var proveedor = new Proveedor
        {
            Nombre   = req.Nombre.Trim(),
            Contacto = req.Contacto?.Trim(),
            Telefono = req.Telefono?.Trim(),
            Email    = req.Email?.Trim().ToLower(),
            Activo   = true,
            CreadoEn = DateTime.UtcNow
        };

        db.Proveedores.Add(proveedor);
        await db.SaveChangesAsync();
        return Ok(proveedor);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProveedorRequest req)
    {
        var proveedor = await db.Proveedores.FindAsync(id);
        if (proveedor is null) return NotFound();

        proveedor.Nombre   = req.Nombre.Trim();
        proveedor.Contacto = req.Contacto?.Trim();
        proveedor.Telefono = req.Telefono?.Trim();
        proveedor.Email    = req.Email?.Trim().ToLower();

        await db.SaveChangesAsync();
        return Ok(proveedor);
    }

    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(int id)
    {
        var proveedor = await db.Proveedores.FindAsync(id);
        if (proveedor is null) return NotFound();

        proveedor.Activo = !proveedor.Activo;
        await db.SaveChangesAsync();
        return Ok(new { proveedor.Id, proveedor.Activo });
    }
}

public record ProveedorRequest(
    string Nombre,
    string? Contacto,
    string? Telefono,
    string? Email
);
