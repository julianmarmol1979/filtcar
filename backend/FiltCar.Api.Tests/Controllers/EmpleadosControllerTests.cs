using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Controllers;

public class EmpleadosControllerTests
{
    [Fact]
    public async Task GetAll_WithSearch_FiltersByNombreApellidoUsername()
    {
        using var db = TestDb.Create();
        db.Empleados.AddRange(
            new Empleado { Nombre = "Juan", Apellido = "García", Username = "juangarcia", PasswordHash = "x", Rol = UserRole.EmpleadoVentas },
            new Empleado { Nombre = "Ana", Apellido = "López", Username = "analopez", PasswordHash = "x", Rol = UserRole.EmpleadoVentas }
        );
        await db.SaveChangesAsync();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.GetAll("garcia");

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("Juan", json);
        Assert.DoesNotContain("Ana", json);
    }

    [Fact]
    public async Task Create_NewUsername_CreatesEmpleado()
    {
        using var db = TestDb.Create();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.Create(new EmpleadoCreateRequest("Juan", "García", "juangarcia", "secret123", "EmpleadoVentas", "admin"));

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(1, await db.Empleados.CountAsync());
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("UsuarioCreate", log.Action);
        Assert.Equal("admin", log.Username);
    }

    [Fact]
    public async Task Create_DuplicateUsername_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        db.Empleados.Add(new Empleado { Nombre = "A", Apellido = "B", Username = "juangarcia", PasswordHash = "x", Rol = UserRole.EmpleadoVentas });
        await db.SaveChangesAsync();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.Create(new EmpleadoCreateRequest("Juan", "García", "juangarcia", "secret123", "EmpleadoVentas"));

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("ya existe", bad.Value!.ToString());
    }

    [Fact]
    public async Task Create_AtUserLimit_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        db.Licencias.Add(new Licencia { Plan = "Basico", MaxUsuarios = 1, Activa = true });
        db.Empleados.Add(new Empleado { Nombre = "Admin", Apellido = "X", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin, Activo = true });
        await db.SaveChangesAsync();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.Create(new EmpleadoCreateRequest("Juan", "García", "juangarcia", "secret123", "EmpleadoVentas"));

        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("límite", bad.Value!.ToString());
        Assert.Equal(1, await db.Empleados.CountAsync());
    }

    [Fact]
    public async Task Create_BelowUserLimit_Succeeds()
    {
        using var db = TestDb.Create();
        db.Licencias.Add(new Licencia { Plan = "Pro", MaxUsuarios = 3, Activa = true });
        db.Empleados.Add(new Empleado { Nombre = "Admin", Apellido = "X", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin, Activo = true });
        await db.SaveChangesAsync();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.Create(new EmpleadoCreateRequest("Juan", "García", "juangarcia", "secret123", "EmpleadoVentas"));

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(2, await db.Empleados.CountAsync());
    }

    [Fact]
    public async Task Update_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.Update(999, new EmpleadoUpdateRequest("Juan", "García", "juangarcia", null, "EmpleadoVentas"));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Update_DuplicateUsernameOnAnotherEmpleado_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var e1 = new Empleado { Nombre = "A", Apellido = "B", Username = "user1", PasswordHash = "x", Rol = UserRole.EmpleadoVentas };
        var e2 = new Empleado { Nombre = "C", Apellido = "D", Username = "user2", PasswordHash = "x", Rol = UserRole.EmpleadoVentas };
        db.Empleados.AddRange(e1, e2);
        await db.SaveChangesAsync();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.Update(e2.Id, new EmpleadoUpdateRequest("C", "D", "user1", null, "EmpleadoVentas"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Update_WithPassword_UpdatesHash()
    {
        using var db = TestDb.Create();
        var e1 = new Empleado { Nombre = "A", Apellido = "B", Username = "user1", PasswordHash = "old", Rol = UserRole.EmpleadoVentas };
        db.Empleados.Add(e1);
        await db.SaveChangesAsync();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        await controller.Update(e1.Id, new EmpleadoUpdateRequest("A", "B", "user1", "newpassword", "EmpleadoVentas"));

        var updated = await db.Empleados.FindAsync(e1.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("newpassword", updated!.PasswordHash));
    }

    [Fact]
    public async Task Toggle_AdminUser_CannotBeDeactivated()
    {
        using var db = TestDb.Create();
        var admin = new Empleado { Nombre = "Admin", Apellido = "X", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin, Activo = true };
        db.Empleados.Add(admin);
        await db.SaveChangesAsync();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.Toggle(admin.Id, "admin");

        Assert.IsType<BadRequestObjectResult>(result);
        var unchanged = await db.Empleados.FindAsync(admin.Id);
        Assert.True(unchanged!.Activo);
    }

    [Fact]
    public async Task Toggle_NonExisting_ReturnsNotFound()
    {
        using var db = TestDb.Create();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.Toggle(999, "admin");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Toggle_Deactivate_FlipsActivo()
    {
        using var db = TestDb.Create();
        var empleado = new Empleado { Nombre = "Juan", Apellido = "García", Username = "juangarcia", PasswordHash = "x", Rol = UserRole.EmpleadoVentas, Activo = true };
        db.Empleados.Add(empleado);
        await db.SaveChangesAsync();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        await controller.Toggle(empleado.Id, "admin");

        var updated = await db.Empleados.FindAsync(empleado.Id);
        Assert.False(updated!.Activo);
    }

    [Fact]
    public async Task Toggle_ReactivateAtUserLimit_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        db.Licencias.Add(new Licencia { Plan = "Basico", MaxUsuarios = 1, Activa = true });
        var admin = new Empleado { Nombre = "Admin", Apellido = "X", Username = "admin", PasswordHash = "x", Rol = UserRole.Admin, Activo = true };
        var inactivo = new Empleado { Nombre = "Juan", Apellido = "García", Username = "juangarcia", PasswordHash = "x", Rol = UserRole.EmpleadoVentas, Activo = false };
        db.Empleados.AddRange(admin, inactivo);
        await db.SaveChangesAsync();
        var controller = new EmpleadosController(db, new ActivityLogger(db));

        var result = await controller.Toggle(inactivo.Id, "admin");

        Assert.IsType<BadRequestObjectResult>(result);
        var unchanged = await db.Empleados.FindAsync(inactivo.Id);
        Assert.False(unchanged!.Activo);
    }
}
