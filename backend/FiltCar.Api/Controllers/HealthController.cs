using Microsoft.AspNetCore.Mvc;

namespace FiltCar.Api.Controllers;

[ApiController]
[Route("health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", version = "2026-05-04-b" });
}
