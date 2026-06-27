using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class CajaControllerTests
{
    private static async Task<Empleado> SeedEmpleado(Data.AppDbContext db)
    {
        var empleado = new Empleado { Nombre = "A", Apellido = "B", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin };
        db.Empleados.Add(empleado);
        await db.SaveChangesAsync();
        return empleado;
    }

    [Fact]
    public async Task GetAll_ComputesBalance_AperturaAndIngresoSumRetiroSubtracts()
    {
        using var db = TestDb.Create();
        var empleado = await SeedEmpleado(db);
        db.CajaMovimientos.AddRange(
            new CajaMovimiento { Tipo = CajaMovimientoTipo.Apertura, Monto = 100, EmpleadoId = empleado.Id },
            new CajaMovimiento { Tipo = CajaMovimientoTipo.Ingreso, Monto = 50, EmpleadoId = empleado.Id },
            new CajaMovimiento { Tipo = CajaMovimientoTipo.Retiro, Monto = 30, EmpleadoId = empleado.Id },
            new CajaMovimiento { Tipo = CajaMovimientoTipo.Arqueo, Monto = 999, EmpleadoId = empleado.Id }
        );
        await db.SaveChangesAsync();
        var controller = new CajaController(db, new ActivityLogger(db));

        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"balance\":120", json);
    }

    [Fact]
    public async Task Create_EmpleadoNotFound_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var controller = new CajaController(db, new ActivityLogger(db));

        var result = await controller.Create(new CajaMovimientoRequest("Ingreso", 100, null, "ghost"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_ValidRequest_AddsMovimientoAndLogs()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = new CajaController(db, new ActivityLogger(db));

        var result = await controller.Create(new CajaMovimientoRequest("Ingreso", 250, "cobro deuda", "admin"));

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, await db.CajaMovimientos.CountAsync());
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("CajaMovimiento", log.Action);
    }
}
