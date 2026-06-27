using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class VentasControllerTests
{
    private static async Task<(Empleado empleado, Cliente cliente, Articulo articulo)> SeedBase(Data.AppDbContext db, int stock = 10)
    {
        var empleado = new Empleado { Nombre = "A", Apellido = "B", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin };
        var cliente = new Cliente { Nombre = "Juan", Apellido = "García" };
        var articulo = new Articulo { Marca = "Mahle", Modelo = "OC 295", Stock = stock, Precio = 100 };
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
        var controller = new VentasController(db, new ActivityLogger(db));
        await controller.Create(new VentaCreateRequest(cliente.Id, "admin", 0, "Contado", [new VentaItemRequest(articulo.Id, 2)]));
        var venta = await db.Ventas.SingleAsync();

        var result = await controller.GetDetail(venta.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Mahle", json);
    }

    [Fact]
    public async Task GetDetail_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new VentasController(db, new ActivityLogger(db));

        var result = await controller.GetDetail(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Create_NoItems_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var controller = new VentasController(db, new ActivityLogger(db));

        var result = await controller.Create(new VentaCreateRequest(null, "admin", 0, "Contado", []));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_DeudaSinCliente_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, _, articulo) = await SeedBase(db);
        var controller = new VentasController(db, new ActivityLogger(db));

        var result = await controller.Create(new VentaCreateRequest(
            null, "admin", 0, "Deuda", [new VentaItemRequest(articulo.Id, 1)]));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_EmpleadoNotFound_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, _, articulo) = await SeedBase(db);
        var controller = new VentasController(db, new ActivityLogger(db));

        var result = await controller.Create(new VentaCreateRequest(
            null, "ghost", 0, "Contado", [new VentaItemRequest(articulo.Id, 1)]));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_ArticuloNotFound_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        await SeedBase(db);
        var controller = new VentasController(db, new ActivityLogger(db));

        var result = await controller.Create(new VentaCreateRequest(
            null, "admin", 0, "Contado", [new VentaItemRequest(999, 1)]));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_StockInsuficiente_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, _, articulo) = await SeedBase(db, stock: 2);
        var controller = new VentasController(db, new ActivityLogger(db));

        var result = await controller.Create(new VentaCreateRequest(
            null, "admin", 0, "Contado", [new VentaItemRequest(articulo.Id, 5)]));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_Contado_DecreasesStockAndMarksPagado()
    {
        using var db = TestDb.Create();
        var (_, cliente, articulo) = await SeedBase(db, stock: 10);
        var controller = new VentasController(db, new ActivityLogger(db));

        var result = await controller.Create(new VentaCreateRequest(
            cliente.Id, "admin", 50, "Contado", [new VentaItemRequest(articulo.Id, 3)]));

        Assert.IsType<OkObjectResult>(result);
        var updatedArticulo = await db.Articulos.FindAsync(articulo.Id);
        Assert.Equal(7, updatedArticulo!.Stock);
        var venta = await db.Ventas.SingleAsync();
        Assert.Equal(250, venta.Total); // 300 - 50 descuento
        Assert.Equal(250, venta.MontoPagado);
        Assert.Equal(0, venta.SaldoPendiente);
        Assert.Equal(0, await db.DeudasClientes.CountAsync());
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("VentaCreate", log.Action);
    }

    [Fact]
    public async Task Create_Deuda_CreatesDeudaClienteRecord()
    {
        using var db = TestDb.Create();
        var (_, cliente, articulo) = await SeedBase(db, stock: 10);
        var controller = new VentasController(db, new ActivityLogger(db));

        var result = await controller.Create(new VentaCreateRequest(
            cliente.Id, "admin", 0, "Deuda", [new VentaItemRequest(articulo.Id, 2)]));

        Assert.IsType<OkObjectResult>(result);
        var venta = await db.Ventas.SingleAsync();
        Assert.Equal(0, venta.MontoPagado);
        Assert.Equal(200, venta.SaldoPendiente);
        var deuda = await db.DeudasClientes.SingleAsync();
        Assert.Equal(200, deuda.SaldoPendiente);
        Assert.Equal(cliente.Id, deuda.ClienteId);
    }

    [Fact]
    public async Task GetAll_WithSearch_FiltersByClienteName()
    {
        using var db = TestDb.Create();
        var (empleado, cliente, articulo) = await SeedBase(db);
        var otroCliente = new Cliente { Nombre = "Ana", Apellido = "López" };
        db.Clientes.Add(otroCliente);
        await db.SaveChangesAsync();

        db.Ventas.Add(new Venta { ClienteId = cliente.Id, EmpleadoId = empleado.Id, Total = 100, FormaPago = PaymentMethod.Contado });
        db.Ventas.Add(new Venta { ClienteId = otroCliente.Id, EmpleadoId = empleado.Id, Total = 200, FormaPago = PaymentMethod.Contado });
        await db.SaveChangesAsync();

        var controller = new VentasController(db, new ActivityLogger(db));
        var result = await controller.GetAll("garcía");

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        var rows = System.Text.Json.JsonSerializer.Deserialize<List<System.Text.Json.JsonElement>>(json)!;
        Assert.Single(rows);
        Assert.Equal("García, Juan", rows[0].GetProperty("ClienteNombre").GetString());
    }
}
