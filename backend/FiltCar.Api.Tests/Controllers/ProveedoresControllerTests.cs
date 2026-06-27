using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class ProveedoresControllerTests
{
    [Fact]
    public async Task GetAll_WithSearch_FiltersByNombreContactoTelefonoEmail()
    {
        using var db = TestDb.Create();
        db.Proveedores.AddRange(
            new Proveedor { Nombre = "Bardahl Argentina", Contacto = "Tomás", Telefono = "111", Email = "a@a.com" },
            new Proveedor { Nombre = "Mahle", Contacto = "Rodrigo", Telefono = "222", Email = "b@b.com" }
        );
        await db.SaveChangesAsync();
        var controller = new ProveedoresController(db, new ActivityLogger(db));

        var result = await controller.GetAll("bardahl");

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Bardahl", json);
        Assert.DoesNotContain("Mahle", json);
    }

    [Fact]
    public async Task Create_AddsProveedorAndLogsActivity()
    {
        using var db = TestDb.Create();
        var controller = new ProveedoresController(db, new ActivityLogger(db));

        var result = await controller.Create(new ProveedorRequest("Bosch", "Fernanda", "044", "f@bosch.com", "admin"));

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, await db.Proveedores.CountAsync());
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("ProveedorCreate", log.Action);
    }

    [Fact]
    public async Task Update_Existing_UpdatesFieldsAndLogs()
    {
        using var db = TestDb.Create();
        var proveedor = new Proveedor { Nombre = "Bosch", Telefono = "111" };
        db.Proveedores.Add(proveedor);
        await db.SaveChangesAsync();
        var controller = new ProveedoresController(db, new ActivityLogger(db));

        var result = await controller.Update(proveedor.Id, new ProveedorRequest("Bosch Repuestos", "Fernanda", "999", "f@bosch.com", "admin"));

        Assert.IsType<OkObjectResult>(result);
        var updated = await db.Proveedores.FindAsync(proveedor.Id);
        Assert.Equal("Bosch Repuestos", updated!.Nombre);
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("ProveedorUpdate", log.Action);
    }

    [Fact]
    public async Task Update_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new ProveedoresController(db, new ActivityLogger(db));

        var result = await controller.Update(999, new ProveedorRequest("Bosch", null, null, null));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Toggle_Existing_FlipsActivo()
    {
        using var db = TestDb.Create();
        var proveedor = new Proveedor { Nombre = "Bosch", Activo = true };
        db.Proveedores.Add(proveedor);
        await db.SaveChangesAsync();
        var controller = new ProveedoresController(db, new ActivityLogger(db));

        await controller.Toggle(proveedor.Id, "admin");

        var updated = await db.Proveedores.FindAsync(proveedor.Id);
        Assert.False(updated!.Activo);
    }

    [Fact]
    public async Task Toggle_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new ProveedoresController(db, new ActivityLogger(db));

        var result = await controller.Toggle(999, "admin");

        Assert.IsType<NotFoundResult>(result);
    }
}
