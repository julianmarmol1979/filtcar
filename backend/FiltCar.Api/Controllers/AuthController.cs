using FiltCar.Api.Data;
using FiltCar.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, IConfiguration config, IAvatarUploadService avatarUploadService) : ControllerBase
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
            rol = empleado.Rol.ToString(),
            fotoUrl = empleado.FotoUrl
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
            rol = empleado.Rol.ToString(),
            fotoUrl = empleado.FotoUrl
        });
    }

    [HttpPost("foto")]
    public async Task<IActionResult> SubirFoto([FromForm] string username, [FromForm] IFormFile foto)
    {
        if (string.IsNullOrEmpty(username))
            return Unauthorized(new { message = "Usuario requerido" });
        if (foto.Length == 0)
            return BadRequest(new { message = "Archivo vacío" });
        if (foto.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "La imagen no puede superar 5MB" });
        if (!foto.ContentType.StartsWith("image/"))
            return BadRequest(new { message = "El archivo debe ser una imagen" });

        var empleado = await db.Empleados.FirstOrDefaultAsync(e => e.Username == username && e.Activo);
        if (empleado is null)
            return Unauthorized(new { message = "Usuario no encontrado" });

        string url;
        try
        {
            await using var stream = foto.OpenReadStream();
            url = await avatarUploadService.UploadAvatarAsync(stream, foto.FileName, foto.ContentType);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Error al subir a Supabase: {ex.Message}" });
        }

        empleado.FotoUrl = url;
        await db.SaveChangesAsync();

        return Ok(new { fotoUrl = url });
    }

    [HttpPatch("cambiar-password")]
    public async Task<IActionResult> CambiarPassword([FromBody] CambiarPasswordRequest req)
    {
        if (string.IsNullOrEmpty(req.Username))
            return BadRequest(new { message = "Usuario requerido" });

        var empleado = await db.Empleados.FirstOrDefaultAsync(e => e.Username == req.Username && e.Activo);
        if (empleado is null)
            return Unauthorized();

        if (!BCrypt.Net.BCrypt.Verify(req.PasswordActual, empleado.PasswordHash))
            return BadRequest(new { message = "La contraseña actual es incorrecta" });

        if (req.PasswordNueva.Length < 6)
            return BadRequest(new { message = "La contraseña debe tener al menos 6 caracteres" });

        empleado.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.PasswordNueva);
        await db.SaveChangesAsync();
        return Ok();
    }
}

public record LoginRequest(string Username, string Password);
public record CambiarPasswordRequest(string Username, string PasswordActual, string PasswordNueva);
