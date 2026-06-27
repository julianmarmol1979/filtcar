using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class DashboardControllerTests
{
    private static async Task<Empleado> SeedEmpleado(Data.AppDbContext db)
    {
        var empleado = new Empleado { Nombre = "A", Apellido = "B", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin };
        db.Empleados.Add(empleado);
        await db.SaveChangesAsync();
        return empleado;
    }

    [Fact]
    public async Task GetResumen_ComputesAggregatesCorrectly()
    {
        using var db = TestDb.Create();
        var empleado = await SeedEmpleado(db);
        db.Articulos.Add(new Articulo { Marca = "M", Modelo = "X", Activo = true });
        db.Clientes.Add(new Cliente { Nombre = "J", Apellido = "G", Activo = true });
        db.Ventas.Add(new Venta { EmpleadoId = empleado.Id, Total = 500, FormaPago = PaymentMethod.Contado, Fecha = DateTime.UtcNow });
        db.Ventas.Add(new Venta { EmpleadoId = empleado.Id, Total = 300, FormaPago = PaymentMethod.Deuda, Fecha = DateTime.UtcNow });
        db.CajaMovimientos.Add(new CajaMovimiento { Tipo = CajaMovimientoTipo.Apertura, Monto = 1000, EmpleadoId = empleado.Id });
        await db.SaveChangesAsync();
        var controller = new DashboardController(db);

        var result = await controller.GetResumen();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"ArticulosActivos\":1", json);
        Assert.Contains("\"ClientesActivos\":1", json);
        Assert.Contains("\"DeudasCantidad\":1", json);
        Assert.Contains("\"SaldoCaja\":1000", json);
    }

    [Fact]
    public async Task GetCharts_GroupsVentasByMonthAndTopArticulos()
    {
        using var db = TestDb.Create();
        var empleado = await SeedEmpleado(db);
        var articulo = new Articulo { Marca = "Mahle", Modelo = "OC 295" };
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();

        var venta = new Venta { EmpleadoId = empleado.Id, Total = 100, FormaPago = PaymentMethod.Contado, Fecha = DateTime.UtcNow };
        db.Ventas.Add(venta);
        await db.SaveChangesAsync();
        db.VentaItems.Add(new VentaItem { VentaId = venta.Id, ArticuloId = articulo.Id, Cantidad = 5, PrecioUnitario = 20, Subtotal = 100 });
        await db.SaveChangesAsync();

        var controller = new DashboardController(db);
        var result = await controller.GetCharts();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Mahle OC 295", json);
    }
}
