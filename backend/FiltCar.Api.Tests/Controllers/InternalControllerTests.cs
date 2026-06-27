using FiltCar.Api.Controllers;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace FiltCar.Api.Tests.Controllers;

public class InternalControllerTests
{
    private static InternalController BuildController(Data.AppDbContext db, string? configuredKey, string? headerKey)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configuredKey is null
                ? []
                : new Dictionary<string, string?> { ["Skylia:InternalKey"] = configuredKey })
            .Build();

        var controller = new InternalController(db, new ActivityLogger(db), config);
        var httpContext = new DefaultHttpContext();
        if (headerKey is not null)
            httpContext.Request.Headers["X-Skylia-Key"] = headerKey;

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return controller;
    }

    [Fact]
    public async Task ActualizarLicencia_NoKeyConfigured_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db, configuredKey: null, headerKey: "anything");

        var result = await controller.ActualizarLicencia(new LicenciaUpdateRequest("Pro", 3, null, true));

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task ActualizarLicencia_WrongKey_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db, configuredKey: "real-key", headerKey: "wrong-key");

        var result = await controller.ActualizarLicencia(new LicenciaUpdateRequest("Pro", 3, null, true));

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task ActualizarLicencia_MissingHeader_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db, configuredKey: "real-key", headerKey: null);

        var result = await controller.ActualizarLicencia(new LicenciaUpdateRequest("Pro", 3, null, true));

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task ActualizarLicencia_CorrectKey_CreatesLicenciaWhenNoneExists()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db, configuredKey: "real-key", headerKey: "real-key");

        var result = await controller.ActualizarLicencia(new LicenciaUpdateRequest("Premium", null, null, true));

        Assert.IsType<OkObjectResult>(result);
        var lic = await db.Licencias.SingleAsync();
        Assert.Equal("Premium", lic.Plan);
        Assert.True(lic.Activa);
    }

    [Fact]
    public async Task ActualizarLicencia_CorrectKey_UpdatesExistingLicencia()
    {
        using var db = TestDb.Create();
        db.Licencias.Add(new Models.Licencia { Plan = "Basico", Activa = true });
        await db.SaveChangesAsync();

        var controller = BuildController(db, configuredKey: "real-key", headerKey: "real-key");
        var vencimiento = DateTime.UtcNow.AddDays(30);

        var result = await controller.ActualizarLicencia(new LicenciaUpdateRequest("Premium", 5, vencimiento, false));

        Assert.IsType<OkObjectResult>(result);
        var lic = await db.Licencias.SingleAsync();
        Assert.Equal("Premium", lic.Plan);
        Assert.Equal(5, lic.MaxUsuarios);
        Assert.False(lic.Activa);
    }

    [Fact]
    public async Task ActualizarLicencia_LogsActivity()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db, configuredKey: "real-key", headerKey: "real-key");

        await controller.ActualizarLicencia(new LicenciaUpdateRequest("Pro", 3, null, true));

        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("Skylia", log.Username);
        Assert.Equal("LicenciaUpdate", log.Action);
    }
}
