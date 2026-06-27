using FiltCar.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("api/licencia")]
public class LicenciaController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var lic = await db.Licencias.FirstOrDefaultAsync();
        if (lic is null)
            return Ok(new { plan = "Premium", maxUsuarios = (int?)null, fechaVencimiento = (DateTime?)null, activa = true, vencida = false, bloqueada = false });

        var vencida = lic.FechaVencimiento.HasValue && lic.FechaVencimiento.Value.Date < DateTime.UtcNow.Date;
        var bloqueada = !lic.Activa || vencida;

        return Ok(new
        {
            plan = lic.Plan,
            maxUsuarios = lic.MaxUsuarios,
            fechaVencimiento = lic.FechaVencimiento,
            activa = lic.Activa,
            vencida,
            bloqueada
        });
    }
}
