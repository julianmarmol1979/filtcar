using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace FiltCar.Api.Tests.Controllers;

public class LicenciaControllerTests
{
    [Fact]
    public async Task Get_NoLicenciaRow_ReturnsDefaultPremiumNotBloqueada()
    {
        using var db = TestDb.Create();
        var controller = new LicenciaController(db);

        var result = await controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"plan\":\"Premium\"", json);
        Assert.Contains("\"bloqueada\":false", json);
    }

    [Fact]
    public async Task Get_ActivaSinVencimiento_NotBloqueada()
    {
        using var db = TestDb.Create();
        db.Licencias.Add(new Licencia { Plan = "Pro", MaxUsuarios = 3, FechaVencimiento = null, Activa = true });
        await db.SaveChangesAsync();
        var controller = new LicenciaController(db);

        var result = await controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"bloqueada\":false", json);
    }

    [Fact]
    public async Task Get_Vencida_ReturnsBloqueadaTrue()
    {
        using var db = TestDb.Create();
        db.Licencias.Add(new Licencia
        {
            Plan = "Basico",
            Activa = true,
            FechaVencimiento = DateTime.UtcNow.AddDays(-1)
        });
        await db.SaveChangesAsync();
        var controller = new LicenciaController(db);

        var result = await controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"vencida\":true", json);
        Assert.Contains("\"bloqueada\":true", json);
    }

    [Fact]
    public async Task Get_Inactiva_ReturnsBloqueadaTrue()
    {
        using var db = TestDb.Create();
        db.Licencias.Add(new Licencia { Plan = "Pro", Activa = false, FechaVencimiento = null });
        await db.SaveChangesAsync();
        var controller = new LicenciaController(db);

        var result = await controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"bloqueada\":true", json);
    }
}
