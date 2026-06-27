using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class DeudasControllerTests
{
    private static async Task<(Empleado empleado, Cliente cliente, Venta venta, DeudaCliente deuda)> SeedDeuda(Data.AppDbContext db, decimal saldo = 1000m, bool cancelada = false)
    {
        var empleado = new Empleado { Nombre = "A", Apellido = "B", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin };
        var cliente = new Cliente { Nombre = "Juan", Apellido = "García" };
        db.Empleados.Add(empleado);
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync();

        var venta = new Venta
        {
            ClienteId = cliente.Id, EmpleadoId = empleado.Id, Total = saldo, FormaPago = PaymentMethod.Deuda,
            MontoPagado = 0, SaldoPendiente = saldo
        };
        db.Ventas.Add(venta);
        await db.SaveChangesAsync();

        var deuda = new DeudaCliente
        {
            ClienteId = cliente.Id, VentaId = venta.Id, MontoOriginal = saldo, MontoPagado = 0,
            SaldoPendiente = saldo, Cancelada = cancelada
        };
        db.DeudasClientes.Add(deuda);
        await db.SaveChangesAsync();

        return (empleado, cliente, venta, deuda);
    }

    [Fact]
    public async Task GetAll_OnlyReturnsNonCanceladas()
    {
        using var db = TestDb.Create();
        await SeedDeuda(db, saldo: 500, cancelada: false);
        await SeedDeuda(db, saldo: 800, cancelada: true);
        var controller = new DeudasController(db, new ActivityLogger(db));

        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("500", json);
        Assert.DoesNotContain("800", json);
    }

    [Fact]
    public async Task Pagar_NonExistingDeuda_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new DeudasController(db, new ActivityLogger(db));

        var result = await controller.Pagar(999, new PagoDeudaRequest(100, "admin"));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Pagar_AlreadyCancelada_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, _, _, deuda) = await SeedDeuda(db, cancelada: true);
        var controller = new DeudasController(db, new ActivityLogger(db));

        var result = await controller.Pagar(deuda.Id, new PagoDeudaRequest(100, "admin"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Pagar_MontoZeroOrNegative_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, _, _, deuda) = await SeedDeuda(db);
        var controller = new DeudasController(db, new ActivityLogger(db));

        var result = await controller.Pagar(deuda.Id, new PagoDeudaRequest(0, "admin"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Pagar_MontoExceedsSaldo_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, _, _, deuda) = await SeedDeuda(db, saldo: 500);
        var controller = new DeudasController(db, new ActivityLogger(db));

        var result = await controller.Pagar(deuda.Id, new PagoDeudaRequest(600, "admin"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Pagar_EmpleadoNotFound_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var (_, _, _, deuda) = await SeedDeuda(db, saldo: 500);
        var controller = new DeudasController(db, new ActivityLogger(db));

        var result = await controller.Pagar(deuda.Id, new PagoDeudaRequest(100, "ghost"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Pagar_PartialPayment_UpdatesSaldoAndStaysOpen()
    {
        using var db = TestDb.Create();
        var (_, _, venta, deuda) = await SeedDeuda(db, saldo: 1000);
        var controller = new DeudasController(db, new ActivityLogger(db));

        var result = await controller.Pagar(deuda.Id, new PagoDeudaRequest(400, "admin"));

        Assert.IsType<OkObjectResult>(result);
        var updated = await db.DeudasClientes.FindAsync(deuda.Id);
        Assert.Equal(600, updated!.SaldoPendiente);
        Assert.False(updated.Cancelada);
        var ventaUpdated = await db.Ventas.FindAsync(venta.Id);
        Assert.Equal(400, ventaUpdated!.MontoPagado);
    }

    [Fact]
    public async Task Pagar_FullPayment_MarksCancelada()
    {
        using var db = TestDb.Create();
        var (_, _, _, deuda) = await SeedDeuda(db, saldo: 1000);
        var controller = new DeudasController(db, new ActivityLogger(db));

        var result = await controller.Pagar(deuda.Id, new PagoDeudaRequest(1000, "admin"));

        Assert.IsType<OkObjectResult>(result);
        var updated = await db.DeudasClientes.FindAsync(deuda.Id);
        Assert.Equal(0, updated!.SaldoPendiente);
        Assert.True(updated.Cancelada);
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("DeudaPago", log.Action);
    }
}
