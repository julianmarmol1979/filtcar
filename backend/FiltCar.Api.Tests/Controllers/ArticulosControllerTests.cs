using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class ArticulosControllerTests
{
    [Fact]
    public async Task GetAll_NoSearch_ReturnsAllOrderedByMarcaModelo()
    {
        using var db = TestDb.Create();
        db.Articulos.AddRange(
            new Articulo { Marca = "Mahle", Modelo = "OC 295", Stock = 10, Precio = 100 },
            new Articulo { Marca = "Castrol", Modelo = "GTX", Stock = 5, Precio = 200 }
        );
        await db.SaveChangesAsync();
        var controller = new ArticulosController(db, new ActivityLogger(db));

        var result = await controller.GetAll(null);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.True(json.IndexOf("Castrol") < json.IndexOf("Mahle"));
    }

    [Fact]
    public async Task GetAll_WithSearch_FiltersByMarcaModeloOrDescripcion()
    {
        using var db = TestDb.Create();
        db.Articulos.AddRange(
            new Articulo { Marca = "Mahle", Modelo = "OC 295", Descripcion = "Filtro de aceite", Stock = 10, Precio = 100 },
            new Articulo { Marca = "Castrol", Modelo = "GTX", Descripcion = "Aceite mineral", Stock = 5, Precio = 200 }
        );
        await db.SaveChangesAsync();
        var controller = new ArticulosController(db, new ActivityLogger(db));

        var result = await controller.GetAll("mahle");

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Mahle", json);
        Assert.DoesNotContain("Castrol", json);
    }

    [Fact]
    public async Task Create_AddsArticuloAndLogsActivity()
    {
        using var db = TestDb.Create();
        var controller = new ArticulosController(db, new ActivityLogger(db));

        var result = await controller.Create(new ArticuloRequest("Castrol", "GTX 20W-50", "Aceite", 10, 5000m, "admin"));

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, await db.Articulos.CountAsync());
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("ArticuloCreate", log.Action);
        Assert.Equal("admin", log.Username);
    }

    [Fact]
    public async Task Update_ExistingArticulo_UpdatesFields()
    {
        using var db = TestDb.Create();
        var articulo = new Articulo { Marca = "Mahle", Modelo = "OC 295", Stock = 10, Precio = 100 };
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();
        var controller = new ArticulosController(db, new ActivityLogger(db));

        var result = await controller.Update(articulo.Id, new ArticuloRequest("Mahle", "OC 295", "nueva desc", 20, 150m, "admin"));

        Assert.IsType<OkObjectResult>(result);
        var updated = await db.Articulos.FindAsync(articulo.Id);
        Assert.Equal(20, updated!.Stock);
        Assert.Equal(150m, updated.Precio);
    }

    [Fact]
    public async Task Update_NonExistingArticulo_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new ArticulosController(db, new ActivityLogger(db));

        var result = await controller.Update(999, new ArticuloRequest("Mahle", "OC 295", null, 1, 1m));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Toggle_ExistingArticulo_FlipsActivo()
    {
        using var db = TestDb.Create();
        var articulo = new Articulo { Marca = "Mahle", Modelo = "OC 295", Activo = true };
        db.Articulos.Add(articulo);
        await db.SaveChangesAsync();
        var controller = new ArticulosController(db, new ActivityLogger(db));

        var result = await controller.Toggle(articulo.Id, "admin");

        Assert.IsType<OkObjectResult>(result);
        var updated = await db.Articulos.FindAsync(articulo.Id);
        Assert.False(updated!.Activo);
    }

    [Fact]
    public async Task Toggle_NonExistingArticulo_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new ArticulosController(db, new ActivityLogger(db));

        var result = await controller.Toggle(999, "admin");

        Assert.IsType<NotFoundResult>(result);
    }
}
