using FiltCar.Api.Data;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

// Endpoints de uso exclusivo de Skylia para administrar la licencia de esta instalación.
// No están pensados para ser usados desde el frontend del cliente: se llaman directamente
// (curl/Postman) con la clave maestra configurada en Skylia:InternalKey.
[ApiController]
[Route("api/internal")]
public class InternalController(AppDbContext db, ActivityLogger logger, IConfiguration config) : ControllerBase
{
    [HttpPut("licencia")]
    public async Task<IActionResult> ActualizarLicencia([FromBody] LicenciaUpdateRequest req)
    {
        var key = config["Skylia:InternalKey"];
        if (string.IsNullOrEmpty(key) || !Request.Headers.TryGetValue("X-Skylia-Key", out var provided) || provided != key)
            return Unauthorized();

        var lic = await db.Licencias.FirstOrDefaultAsync();
        if (lic is null)
        {
            lic = new Licencia();
            db.Licencias.Add(lic);
        }

        lic.Plan = req.Plan;
        lic.MaxUsuarios = req.MaxUsuarios;
        lic.FechaVencimiento = req.FechaVencimiento;
        lic.Activa = req.Activa;
        lic.ActualizadoEn = DateTime.UtcNow;

        var vencimientoTexto = req.FechaVencimiento?.ToString("dd/MM/yyyy") ?? "sin vencimiento";
        logger.Log("Skylia", "LicenciaUpdate", $"Plan actualizado a {req.Plan} (vence {vencimientoTexto}, activa={req.Activa})");
        await db.SaveChangesAsync();

        return Ok(new { lic.Plan, lic.MaxUsuarios, lic.FechaVencimiento, lic.Activa });
    }
}

public record LicenciaUpdateRequest(string Plan, int? MaxUsuarios, DateTime? FechaVencimiento, bool Activa);
