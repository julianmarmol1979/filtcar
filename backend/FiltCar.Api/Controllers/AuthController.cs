using FiltCar.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var empleado = await db.Empleados
            .FirstOrDefaultAsync(e => e.Username == req.Username && e.Activo);

        if (empleado is null || !BCrypt.Net.BCrypt.Verify(req.Password, empleado.PasswordHash))
            return Unauthorized(new { message = "Credenciales incorrectas" });

        return Ok(new
        {
            id = empleado.Id,
            nombre = empleado.Nombre,
            apellido = empleado.Apellido,
            username = empleado.Username,
            rol = empleado.Rol.ToString()
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var secret = config["Auth:Secret"] ?? string.Empty;
        if (!Request.Cookies.TryGetValue("filtcar_session", out var token) || token != secret)
            return Unauthorized();

        var username = Request.Cookies["filtcar_user"];
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

        var empleado = await db.Empleados
            .FirstOrDefaultAsync(e => e.Username == username && e.Activo);

        if (empleado is null)
            return Unauthorized();

        return Ok(new
        {
            id = empleado.Id,
            nombre = empleado.Nombre,
            apellido = empleado.Apellido,
            username = empleado.Username,
            rol = empleado.Rol.ToString()
        });
    }
}

public record LoginRequest(string Username, string Password);
