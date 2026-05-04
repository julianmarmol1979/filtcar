using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ArticulosController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = db.Articulos.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(a =>
                a.Marca.ToLower().Contains(s) ||
                a.Modelo.ToLower().Contains(s) ||
                a.Descripcion.ToLower().Contains(s));
        }

        var result = await query
            .OrderBy(a => a.Marca).ThenBy(a => a.Modelo)
            .Select(a => new
            {
                a.Id,
                a.Marca,
                a.Modelo,
                a.Descripcion,
                a.Stock,
                a.Precio,
                a.Activo,
                a.CreadoEn
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ArticuloRequest req)
    {
        var articulo = new Articulo
        {
            Marca       = req.Marca.Trim(),
            Modelo      = req.Modelo.Trim(),
            Descripcion = req.Descripcion?.Trim() ?? string.Empty,
            Stock       = req.Stock,
            Precio      = req.Precio,
            Activo      = true,
            CreadoEn    = DateTime.UtcNow
        };

        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();
        return Ok(articulo);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] ArticuloRequest req)
    {
        var articulo = await db.Articulos.FindAsync(id);
        if (articulo is null) return NotFound();

        articulo.Marca       = req.Marca.Trim();
        articulo.Modelo      = req.Modelo.Trim();
        articulo.Descripcion = req.Descripcion?.Trim() ?? string.Empty;
        articulo.Stock       = req.Stock;
        articulo.Precio      = req.Precio;

        await db.SaveChangesAsync();
        return Ok(articulo);
    }

    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(int id)
    {
        var articulo = await db.Articulos.FindAsync(id);
        if (articulo is null) return NotFound();

        articulo.Activo = !articulo.Activo;
        await db.SaveChangesAsync();
        return Ok(new { articulo.Id, articulo.Activo });
    }
}

public record ArticuloRequest(
    string Marca,
    string Modelo,
    string? Descripcion,
    int Stock,
    decimal Precio
);
