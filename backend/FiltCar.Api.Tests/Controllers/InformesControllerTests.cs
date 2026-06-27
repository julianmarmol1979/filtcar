using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class InformesControllerTests
{
    private static async Task<Empleado> SeedEmpleado(Data.AppDbContext db)
    {
        var empleado = new Empleado { Nombre = "A", Apellido = "B", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin };
        db.Empleados.Add(empleado);
        await db.SaveChangesAsync();
        return empleado;
    }

    [Fact]
    public async Task GetResumen_ComputesTotalsAndTicketPromedio()
    {
        using var db = TestDb.Create();
        var empleado = await SeedEmpleado(db);
        var dia = new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc);
        db.Ventas.Add(new Venta { EmpleadoId = empleado.Id, Total = 100, FormaPago = PaymentMethod.Contado, Fecha = dia });
        db.Ventas.Add(new Venta { EmpleadoId = empleado.Id, Total = 300, FormaPago = PaymentMethod.Tarjeta, Fecha = dia });
        await db.SaveChangesAsync();
        var controller = new InformesController(db);

        var result = await controller.GetResumen(new DateTime(2026, 6, 1), new DateTime(2026, 6, 30));

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"TotalVentas\":400", json);
        Assert.Contains("\"CantidadVentas\":2", json);
        Assert.Contains("\"TicketPromedio\":200", json);
    }

    [Fact]
    public async Task GetResumen_NoVentas_TicketPromedioIsZero()
    {
        using var db = TestDb.Create();
        var controller = new InformesController(db);

        var result = await controller.GetResumen(new DateTime(2026, 6, 1), new DateTime(2026, 6, 30));

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"TicketPromedio\":0", json);
    }

    [Fact]
    public async Task GetVentasPorDia_GroupsByDate()
    {
        using var db = TestDb.Create();
        var empleado = await SeedEmpleado(db);
        db.Ventas.Add(new Venta { EmpleadoId = empleado.Id, Total = 100, FormaPago = PaymentMethod.Contado, Fecha = new DateTime(2026, 6, 10, 9, 0, 0, DateTimeKind.Utc) });
        db.Ventas.Add(new Venta { EmpleadoId = empleado.Id, Total = 50, FormaPago = PaymentMethod.Contado, Fecha = new DateTime(2026, 6, 10, 15, 0, 0, DateTimeKind.Utc) });
        await db.SaveChangesAsync();
        var controller = new InformesController(db);

        var result = await controller.GetVentasPorDia(new DateTime(2026, 6, 1), new DateTime(2026, 6, 30));

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"2026-06-10\"", json);
        Assert.Contains("\"Total\":150", json);
    }

    [Fact]
    public async Task GetTopArticulos_OrdersByUnidadesVendidasDescending()
    {
        using var db = TestDb.Create();
        var empleado = await SeedEmpleado(db);
        var a1 = new Articulo { Marca = "Mahle", Modelo = "OC 295" };
        var a2 = new Articulo { Marca = "Castrol", Modelo = "GTX" };
        db.Articulos.AddRange(a1, a2);
        await db.SaveChangesAsync();

        var venta = new Venta { EmpleadoId = empleado.Id, Total = 0, FormaPago = PaymentMethod.Contado, Fecha = new DateTime(2026, 6, 10) };
        db.Ventas.Add(venta);
        await db.SaveChangesAsync();
        db.VentaItems.AddRange(
            new VentaItem { VentaId = venta.Id, ArticuloId = a1.Id, Cantidad = 10, PrecioUnitario = 10, Subtotal = 100 },
            new VentaItem { VentaId = venta.Id, ArticuloId = a2.Id, Cantidad = 3, PrecioUnitario = 10, Subtotal = 30 }
        );
        await db.SaveChangesAsync();
        var controller = new InformesController(db);

        var result = await controller.GetTopArticulos(new DateTime(2026, 6, 1), new DateTime(2026, 6, 30), 10);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.True(json.IndexOf("Mahle") < json.IndexOf("Castrol"));
    }

    [Fact]
    public async Task GetStockBajo_FiltersByThresholdAndActivo()
    {
        using var db = TestDb.Create();
        db.Articulos.AddRange(
            new Articulo { Marca = "Bajo", Modelo = "X", Stock = 2, Activo = true },
            new Articulo { Marca = "Alto", Modelo = "Y", Stock = 50, Activo = true },
            new Articulo { Marca = "BajoInactivo", Modelo = "Z", Stock = 1, Activo = false }
        );
        await db.SaveChangesAsync();
        var controller = new InformesController(db);

        var result = await controller.GetStockBajo(5);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Bajo", json);
        Assert.DoesNotContain("Alto", json);
        Assert.DoesNotContain("BajoInactivo", json);
    }
}
