using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class TurnosControllerTests
{
    [Fact]
    public async Task List_NoFilters_ReturnsAll()
    {
        using var db = TestDb.Create();
        db.Turnos.AddRange(
            new Turno { Fecha = DateTime.UtcNow, Servicio = "Cambio de aceite" },
            new Turno { Fecha = DateTime.UtcNow.AddDays(1), Servicio = "Filtro de aire" }
        );
        await db.SaveChangesAsync();
        var controller = new TurnosController(db, new ActivityLogger(db));

        var result = await controller.List(null, null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Cambio de aceite", json);
        Assert.Contains("Filtro de aire", json);
    }

    [Fact]
    public async Task List_WithFromTo_FiltersByDateRange()
    {
        using var db = TestDb.Create();
        db.Turnos.AddRange(
            new Turno { Fecha = new DateTime(2026, 6, 1), Servicio = "Viejo" },
            new Turno { Fecha = new DateTime(2026, 6, 15), Servicio = "EnRango" },
            new Turno { Fecha = new DateTime(2026, 7, 1), Servicio = "Futuro" }
        );
        await db.SaveChangesAsync();
        var controller = new TurnosController(db, new ActivityLogger(db));

        var result = await controller.List("2026-06-10", "2026-06-20");

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("EnRango", json);
        Assert.DoesNotContain("Viejo", json);
        Assert.DoesNotContain("Futuro", json);
    }

    [Fact]
    public async Task Create_AddsTurnoAndLogsActivity()
    {
        using var db = TestDb.Create();
        var controller = new TurnosController(db, new ActivityLogger(db));

        var result = await controller.Create(new TurnoRequest(
            DateTime.UtcNow.AddDays(1), "Juan García", null, "123", "AA123BB", "Cambio de aceite", null, null, "admin"));

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, await db.Turnos.CountAsync());
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("TurnoCreate", log.Action);
    }

    [Fact]
    public async Task Update_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new TurnosController(db, new ActivityLogger(db));

        var result = await controller.Update(999, new TurnoRequest(DateTime.UtcNow, null, null, null, null, "Servicio", null, null));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Update_Existing_UpdatesFields()
    {
        using var db = TestDb.Create();
        var turno = new Turno { Fecha = DateTime.UtcNow, Servicio = "Original" };
        db.Turnos.Add(turno);
        await db.SaveChangesAsync();
        var controller = new TurnosController(db, new ActivityLogger(db));

        await controller.Update(turno.Id, new TurnoRequest(DateTime.UtcNow.AddDays(2), "Nuevo Cliente", null, null, null, "Filtro", null, null, "admin"));

        var updated = await db.Turnos.FindAsync(turno.Id);
        Assert.Equal("Filtro", updated!.Servicio);
        Assert.Equal("Nuevo Cliente", updated.ClienteNombre);
    }

    [Fact]
    public async Task UpdateEstado_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new TurnosController(db, new ActivityLogger(db));

        var result = await controller.UpdateEstado(999, new EstadoRequest("Confirmado"));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateEstado_InvalidEstado_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var turno = new Turno { Fecha = DateTime.UtcNow, Servicio = "X" };
        db.Turnos.Add(turno);
        await db.SaveChangesAsync();
        var controller = new TurnosController(db, new ActivityLogger(db));

        var result = await controller.UpdateEstado(turno.Id, new EstadoRequest("EstadoInventado"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateEstado_ValidEstado_UpdatesAndLogs()
    {
        using var db = TestDb.Create();
        var turno = new Turno { Fecha = DateTime.UtcNow, Servicio = "X" };
        db.Turnos.Add(turno);
        await db.SaveChangesAsync();
        var controller = new TurnosController(db, new ActivityLogger(db));

        var result = await controller.UpdateEstado(turno.Id, new EstadoRequest("Completado", "admin"));

        Assert.IsType<OkResult>(result);
        var updated = await db.Turnos.FindAsync(turno.Id);
        Assert.Equal("Completado", updated!.Estado);
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("TurnoEstado", log.Action);
    }

    [Fact]
    public async Task Delete_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new TurnosController(db, new ActivityLogger(db));

        var result = await controller.Delete(999, "admin");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_Existing_RemovesTurnoAndLogs()
    {
        using var db = TestDb.Create();
        var turno = new Turno { Fecha = DateTime.UtcNow, Servicio = "X" };
        db.Turnos.Add(turno);
        await db.SaveChangesAsync();
        var controller = new TurnosController(db, new ActivityLogger(db));

        var result = await controller.Delete(turno.Id, "admin");

        Assert.IsType<OkResult>(result);
        Assert.Equal(0, await db.Turnos.CountAsync());
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("TurnoDelete", log.Action);
    }
}
