using FiltCar.Api.Data;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AutosController(AppDbContext db, ActivityLogger logger) : ControllerBase
{
    // GET /api/autos?clienteId=1&search=abc
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? clienteId, [FromQuery] string? search)
    {
        var query = db.Autos.Include(a => a.Cliente).AsQueryable();

        if (clienteId is int cid)
            query = query.Where(a => a.ClienteId == cid);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(a =>
                a.Patente.ToLower().Contains(s) ||
                (a.Marca != null && a.Marca.ToLower().Contains(s)) ||
                (a.Modelo != null && a.Modelo.ToLower().Contains(s)));
        }

        var result = await query
            .OrderBy(a => a.Patente)
            .Select(a => new
            {
                a.Id,
                a.ClienteId,
                Cliente = new { a.Cliente.Nombre, a.Cliente.Apellido },
                a.Patente,
                a.Marca,
                a.Modelo,
                a.Anio,
                a.Color,
                a.Kilometraje,
                a.Activo,
                a.CreadoEn
            })
            .ToListAsync();

        return Ok(result);
    }

    // POST /api/autos
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AutoRequest req)
    {
        var cliente = await db.Clientes.FindAsync(req.ClienteId);
        if (cliente is null) return BadRequest(new { message = "Cliente no encontrado" });

        var auto = new Auto
        {
            ClienteId    = req.ClienteId,
            Patente      = req.Patente.Trim().ToUpper(),
            Marca        = req.Marca?.Trim(),
            Modelo       = req.Modelo?.Trim(),
            Anio         = req.Anio?.Trim(),
            Color        = req.Color?.Trim(),
            Kilometraje  = req.Kilometraje,
            Activo       = true,
            CreadoEn     = DateTime.UtcNow
        };

        db.Autos.Add(auto);
        logger.Log(req.Username, "AutoCreate", $"Agregó el vehículo \"{auto.Patente}\" al cliente \"{cliente.Apellido}, {cliente.Nombre}\"");
        await db.SaveChangesAsync();
        return Ok(new { auto.Id, auto.ClienteId, auto.Patente, auto.Marca, auto.Modelo, auto.Anio, auto.Color, auto.Kilometraje, auto.Activo, auto.CreadoEn });
    }

    // PUT /api/autos/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AutoRequest req)
    {
        var auto = await db.Autos.FindAsync(id);
        if (auto is null) return NotFound();

        auto.Patente     = req.Patente.Trim().ToUpper();
        auto.Marca        = req.Marca?.Trim();
        auto.Modelo       = req.Modelo?.Trim();
        auto.Anio         = req.Anio?.Trim();
        auto.Color        = req.Color?.Trim();
        auto.Kilometraje  = req.Kilometraje;

        logger.Log(req.Username, "AutoUpdate", $"Actualizó el vehículo \"{auto.Patente}\"");
        await db.SaveChangesAsync();
        return Ok(new { auto.Id, auto.ClienteId, auto.Patente, auto.Marca, auto.Modelo, auto.Anio, auto.Color, auto.Kilometraje, auto.Activo, auto.CreadoEn });
    }

    // PATCH /api/autos/{id}/toggle
    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(int id, [FromQuery] string? username)
    {
        var auto = await db.Autos.FindAsync(id);
        if (auto is null) return NotFound();

        auto.Activo = !auto.Activo;
        logger.Log(username, "AutoToggle", $"{(auto.Activo ? "Activó" : "Desactivó")} el vehículo \"{auto.Patente}\"");
        await db.SaveChangesAsync();
        return Ok(new { auto.Id, auto.Activo });
    }
}

public record AutoRequest(
    int     ClienteId,
    string  Patente,
    string? Marca,
    string? Modelo,
    string? Anio,
    string? Color,
    int?    Kilometraje,
    string? Username = null
);
