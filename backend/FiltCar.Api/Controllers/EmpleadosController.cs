using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmpleadosController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = db.Empleados.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(e =>
                e.Nombre.ToLower().Contains(s) ||
                e.Apellido.ToLower().Contains(s) ||
                e.Username.ToLower().Contains(s));
        }

        var result = await query
            .OrderBy(e => e.Apellido).ThenBy(e => e.Nombre)
            .Select(e => new
            {
                e.Id,
                e.Nombre,
                e.Apellido,
                e.Username,
                Rol = e.Rol.ToString(),
                e.Activo,
                e.CreadoEn
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EmpleadoCreateRequest req)
    {
        if (await db.Empleados.AnyAsync(e => e.Username == req.Username))
            return BadRequest(new { message = "El nombre de usuario ya existe" });

        var empleado = new Empleado
        {
            Nombre       = req.Nombre.Trim(),
            Apellido     = req.Apellido.Trim(),
            Username     = req.Username.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 11),
            Rol          = Enum.Parse<UserRole>(req.Rol),
            Activo       = true,
            CreadoEn     = DateTime.UtcNow
        };

        db.Empleados.Add(empleado);
        await db.SaveChangesAsync();
        return Ok(new { empleado.Id, empleado.Nombre, empleado.Apellido, empleado.Username, Rol = empleado.Rol.ToString(), empleado.Activo });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] EmpleadoUpdateRequest req)
    {
        var empleado = await db.Empleados.FindAsync(id);
        if (empleado is null) return NotFound();

        // Check username uniqueness (excluding self)
        if (await db.Empleados.AnyAsync(e => e.Username == req.Username && e.Id != id))
            return BadRequest(new { message = "El nombre de usuario ya existe" });

        empleado.Nombre   = req.Nombre.Trim();
        empleado.Apellido = req.Apellido.Trim();
        empleado.Username = req.Username.Trim().ToLower();
        empleado.Rol      = Enum.Parse<UserRole>(req.Rol);

        // Only update password if provided
        if (!string.IsNullOrWhiteSpace(req.Password))
            empleado.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 11);

        await db.SaveChangesAsync();
        return Ok(new { empleado.Id, empleado.Nombre, empleado.Apellido, empleado.Username, Rol = empleado.Rol.ToString(), empleado.Activo });
    }

    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> Toggle(int id)
    {
        var empleado = await db.Empleados.FindAsync(id);
        if (empleado is null) return NotFound();

        if (empleado.Username == "admin")
            return BadRequest(new { message = "No se puede desactivar el usuario administrador" });

        empleado.Activo = !empleado.Activo;
        await db.SaveChangesAsync();
        return Ok(new { empleado.Id, empleado.Activo });
    }
}

public record EmpleadoCreateRequest(
    string Nombre,
    string Apellido,
    string Username,
    string Password,
    string Rol
);

public record EmpleadoUpdateRequest(
    string Nombre,
    string Apellido,
    string Username,
    string? Password,
    string Rol
);
