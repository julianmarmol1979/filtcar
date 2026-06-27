using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class ClientesControllerTests
{
    [Fact]
    public async Task GetAll_WithSearch_FiltersByNombreApellidoTelefonoEmail()
    {
        using var db = TestDb.Create();
        db.Clientes.AddRange(
            new Cliente { Nombre = "Juan", Apellido = "García", Telefono = "123", Email = "juan@x.com" },
            new Cliente { Nombre = "Ana", Apellido = "López", Telefono = "456", Email = "ana@x.com" }
        );
        await db.SaveChangesAsync();
        var controller = new ClientesController(db, new ActivityLogger(db));

        var result = await controller.GetAll("garcía");

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Juan", json);
        Assert.DoesNotContain("Ana", json);
    }

    [Fact]
    public async Task Create_AddsClienteAndLogsActivity()
    {
        using var db = TestDb.Create();
        var controller = new ClientesController(db, new ActivityLogger(db));

        var result = await controller.Create(new ClienteRequest("Juan", "García", "123", "juan@x.com", "Calle 1", "admin"));

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, await db.Clientes.CountAsync());
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("ClienteCreate", log.Action);
    }

    [Fact]
    public async Task Update_Existing_UpdatesFieldsAndLogs()
    {
        using var db = TestDb.Create();
        var cliente = new Cliente { Nombre = "Juan", Apellido = "García", Telefono = "111" };
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync();
        var controller = new ClientesController(db, new ActivityLogger(db));

        var result = await controller.Update(cliente.Id, new ClienteRequest("Juan", "García", "999", "nuevo@x.com", "Calle 2", "admin"));

        Assert.IsType<OkObjectResult>(result);
        var updated = await db.Clientes.FindAsync(cliente.Id);
        Assert.Equal("999", updated!.Telefono);
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("ClienteUpdate", log.Action);
    }

    [Fact]
    public async Task Update_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new ClientesController(db, new ActivityLogger(db));

        var result = await controller.Update(999, new ClienteRequest("Juan", "García", null, null, null));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Toggle_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new ClientesController(db, new ActivityLogger(db));

        var result = await controller.Toggle(999, "admin");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Toggle_Existing_FlipsActivo()
    {
        using var db = TestDb.Create();
        var cliente = new Cliente { Nombre = "Juan", Apellido = "García", Activo = true };
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync();
        var controller = new ClientesController(db, new ActivityLogger(db));

        await controller.Toggle(cliente.Id, "admin");

        var updated = await db.Clientes.FindAsync(cliente.Id);
        Assert.False(updated!.Activo);
    }

    [Fact]
    public async Task Historial_NonExistingCliente_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new ClientesController(db, new ActivityLogger(db));

        var result = await controller.Historial(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Historial_ExistingCliente_ReturnsVentasAndPresupuestos()
    {
        using var db = TestDb.Create();
        var cliente = new Cliente { Nombre = "Juan", Apellido = "García" };
        var empleado = new Empleado { Nombre = "A", Apellido = "B", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin };
        db.Clientes.Add(cliente);
        db.Empleados.Add(empleado);
        await db.SaveChangesAsync();

        db.Ventas.Add(new Venta { ClienteId = cliente.Id, EmpleadoId = empleado.Id, Total = 100, FormaPago = PaymentMethod.Contado });
        db.Presupuestos.Add(new Presupuesto { ClienteId = cliente.Id, EmpleadoId = empleado.Id, Total = 50, Vencimiento = DateTime.UtcNow.AddDays(5) });
        await db.SaveChangesAsync();

        var controller = new ClientesController(db, new ActivityLogger(db));
        var result = await controller.Historial(cliente.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"ventas\"", json);
        Assert.Contains("\"presupuestos\"", json);
    }
}
