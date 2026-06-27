using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class PresupuestosControllerTests
{
    private static async Task<(Empleado empleado, Cliente cliente, Articulo articulo)> SeedBase(Data.AppDbContext db)
    {
        var empleado = new Empleado { Nombre = "A", Apellido = "B", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin };
        var cliente = new Cliente { Nombre = "Juan", Apellido = "García" };
        var articulo = new Articulo { Marca = "Mahle", Modelo = "OC 295", Stock = 10, Precio = 250 };
        db.Empleados.Add(empleado);
        db.Clientes.Add(cliente);
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();
        return (empleado, cliente, articulo);
    }

    [Fact]
    public async Task GetDetail_Existing_ReturnsFullDetail()
    {
        using var db = TestDb.Create();
        var (_, cliente, articulo) = await SeedBase(db);
        var controller = new PresupuestosController(db, new ActivityLogger(db));
        await controller.Create(new PresupuestoCreateRequest(cliente.Id, "admin", DateTime.UtcNow.AddDays(5), "nota", [new PresupuestoItemRequest(articulo.Id, 2)]));
        var presupuesto = await db.Presupuestos.SingleAsync();

        var result = await controller.GetDetail(presupuesto.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Mahle", json);
    }

    [Fact]
    public async Task GetDetail_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new PresupuestosController(db, new ActivityLogger(db));

        var result = await controller.GetDetail(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Create_NoItems_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var controller = new PresupuestosController(db, new ActivityLogger(db));

        var result = await controller.Create(new PresupuestoCreateRequest(null, "admin", DateTime.UtcNow.AddDays(5), null, []));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_EmpleadoNotFound_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, _, articulo) = await SeedBase(db);
        var controller = new PresupuestosController(db, new ActivityLogger(db));

        var result = await controller.Create(new PresupuestoCreateRequest(
            null, "ghost", DateTime.UtcNow.AddDays(5), null, [new PresupuestoItemRequest(articulo.Id, 2)]));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_ArticuloNotFound_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        await SeedBase(db);
        var controller = new PresupuestosController(db, new ActivityLogger(db));

        var result = await controller.Create(new PresupuestoCreateRequest(
            null, "admin", DateTime.UtcNow.AddDays(5), null, [new PresupuestoItemRequest(999, 2)]));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_ValidRequest_ComputesTotalFromArticuloPrecio()
    {
        using var db = TestDb.Create();
        var (_, cliente, articulo) = await SeedBase(db);
        var controller = new PresupuestosController(db, new ActivityLogger(db));

        var result = await controller.Create(new PresupuestoCreateRequest(
            cliente.Id, "admin", DateTime.UtcNow.AddDays(5), "nota", [new PresupuestoItemRequest(articulo.Id, 3)]));

        Assert.IsType<OkObjectResult>(result);
        var presupuesto = await db.Presupuestos.SingleAsync();
        Assert.Equal(750, presupuesto.Total); // 250 * 3
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("PresupuestoCreate", log.Action);
    }

    [Fact]
    public async Task GetAll_MarksVencidoCorrectly()
    {
        using var db = TestDb.Create();
        var (empleado, cliente, articulo) = await SeedBase(db);
        db.Presupuestos.Add(new Presupuesto
        {
            ClienteId = cliente.Id, EmpleadoId = empleado.Id, Total = 100,
            Vencimiento = DateTime.UtcNow.AddDays(-5)
        });
        await db.SaveChangesAsync();
        var controller = new PresupuestosController(db, new ActivityLogger(db));

        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"Vencido\":true", json);
    }
}
