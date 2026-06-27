using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class ComprasControllerTests
{
    private static async Task<(Empleado empleado, Proveedor proveedor, Articulo articulo)> SeedBase(Data.AppDbContext db, int stockInicial = 10)
    {
        var empleado = new Empleado { Nombre = "A", Apellido = "B", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin };
        var proveedor = new Proveedor { Nombre = "Bosch" };
        var articulo = new Articulo { Marca = "Mahle", Modelo = "OC 295", Stock = stockInicial, Precio = 100 };
        db.Empleados.Add(empleado);
        db.Proveedores.Add(proveedor);
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();
        return (empleado, proveedor, articulo);
    }

    [Fact]
    public async Task GetAll_ReturnsComprasWithProveedorAndEmpleadoNames()
    {
        using var db = TestDb.Create();
        var (_, proveedor, articulo) = await SeedBase(db);
        var controller = new ComprasController(db, new ActivityLogger(db));
        await controller.Create(new CompraCreateRequest(proveedor.Id, "admin", true, [new CompraItemRequest(articulo.Id, 2, 100)]));

        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Bosch", json);
    }

    [Fact]
    public async Task GetDetail_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new ComprasController(db, new ActivityLogger(db));

        var result = await controller.GetDetail(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Create_NoItems_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, proveedor, _) = await SeedBase(db);
        var controller = new ComprasController(db, new ActivityLogger(db));

        var result = await controller.Create(new CompraCreateRequest(proveedor.Id, "admin", true, []));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_EmpleadoNotFound_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, proveedor, articulo) = await SeedBase(db);
        var controller = new ComprasController(db, new ActivityLogger(db));

        var result = await controller.Create(new CompraCreateRequest(
            proveedor.Id, "ghost", true, [new CompraItemRequest(articulo.Id, 5, 100)]));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_ProveedorNotFound_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, _, articulo) = await SeedBase(db);
        var controller = new ComprasController(db, new ActivityLogger(db));

        var result = await controller.Create(new CompraCreateRequest(
            999, "admin", true, [new CompraItemRequest(articulo.Id, 5, 100)]));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_ArticuloNotFound_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, proveedor, _) = await SeedBase(db);
        var controller = new ComprasController(db, new ActivityLogger(db));

        var result = await controller.Create(new CompraCreateRequest(
            proveedor.Id, "admin", true, [new CompraItemRequest(999, 5, 100)]));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Create_PagoInmediato_IncreasesStockAndMarksPagado()
    {
        using var db = TestDb.Create();
        var (_, proveedor, articulo) = await SeedBase(db, stockInicial: 10);
        var controller = new ComprasController(db, new ActivityLogger(db));

        var result = await controller.Create(new CompraCreateRequest(
            proveedor.Id, "admin", true, [new CompraItemRequest(articulo.Id, 5, 100)]));

        Assert.IsType<OkObjectResult>(result);
        var updatedArticulo = await db.Articulos.FindAsync(articulo.Id);
        Assert.Equal(15, updatedArticulo!.Stock);
        var compra = await db.Compras.SingleAsync();
        Assert.Equal(500, compra.Total);
        Assert.Equal(500, compra.MontoPagado);
        Assert.Equal(0, compra.SaldoPendiente);
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("CompraCreate", log.Action);
    }

    [Fact]
    public async Task Create_NoPagoInmediato_LeavesSaldoPendiente()
    {
        using var db = TestDb.Create();
        var (_, proveedor, articulo) = await SeedBase(db);
        var controller = new ComprasController(db, new ActivityLogger(db));

        await controller.Create(new CompraCreateRequest(
            proveedor.Id, "admin", false, [new CompraItemRequest(articulo.Id, 5, 100)]));

        var compra = await db.Compras.SingleAsync();
        Assert.Equal(0, compra.MontoPagado);
        Assert.Equal(500, compra.SaldoPendiente);
    }

    [Fact]
    public async Task GetDetail_Existing_ReturnsFullDetail()
    {
        using var db = TestDb.Create();
        var (_, proveedor, articulo) = await SeedBase(db);
        var controller = new ComprasController(db, new ActivityLogger(db));
        await controller.Create(new CompraCreateRequest(proveedor.Id, "admin", true, [new CompraItemRequest(articulo.Id, 2, 100)]));
        var compra = await db.Compras.SingleAsync();

        var result = await controller.GetDetail(compra.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Bosch", json);
    }
}
