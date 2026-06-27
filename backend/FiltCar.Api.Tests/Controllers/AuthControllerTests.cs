using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;

namespace FiltCar.Api.Tests.Controllers;

public class AuthControllerTests
{
    private const string Secret = "test-secret";

    private static AuthController BuildController(
        Data.AppDbContext db,
        IAvatarUploadService? avatarService = null,
        string? cookieHeader = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Auth:Secret"] = Secret })
            .Build();

        var controller = new AuthController(db, config, avatarService ?? Mock.Of<IAvatarUploadService>(), new ActivityLogger(db));

        var httpContext = new DefaultHttpContext();
        if (cookieHeader is not null)
            httpContext.Request.Headers["Cookie"] = cookieHeader;

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return controller;
    }

    private static async Task<Empleado> SeedEmpleado(Data.AppDbContext db, string username = "admin", string password = "secret123", bool activo = true, UserRole rol = UserRole.Admin)
    {
        var empleado = new Empleado
        {
            Nombre = "Admin",
            Apellido = "FiltCar",
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, 11),
            Rol = rol,
            Activo = activo
        };
        db.Empleados.Add(empleado);
        await db.SaveChangesAsync();
        return empleado;
    }

    // ── Login ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_ValidCredentials_ReturnsOkAndLogsActivity()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db);

        var result = await controller.Login(new LoginRequest("admin", "secret123"));

        Assert.IsType<OkObjectResult>(result);
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("Login", log.Action);
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db);

        var result = await controller.Login(new LoginRequest("admin", "wrongpass"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_UnknownUsername_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db);

        var result = await controller.Login(new LoginRequest("ghost", "secret123"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_InactiveUser_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db, activo: false);
        var controller = BuildController(db);

        var result = await controller.Login(new LoginRequest("admin", "secret123"));

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    // ── Me ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Me_ValidSessionAndUserCookies_ReturnsOk()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db, cookieHeader: $"filtcar_session={Secret}; filtcar_user=admin");

        var result = await controller.Me();

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Me_NoSessionCookie_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db);

        var result = await controller.Me();

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Me_WrongSecret_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db, cookieHeader: "filtcar_session=wrong; filtcar_user=admin");

        var result = await controller.Me();

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Me_NoUserCookie_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db, cookieHeader: $"filtcar_session={Secret}");

        var result = await controller.Me();

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Me_UserNotFoundOrInactive_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db, activo: false);
        var controller = BuildController(db, cookieHeader: $"filtcar_session={Secret}; filtcar_user=admin");

        var result = await controller.Me();

        Assert.IsType<UnauthorizedResult>(result);
    }

    // ── SubirFoto ────────────────────────────────────────────────────────────

    private static IFormFile MakeFormFile(string content = "fake-image-bytes", string contentType = "image/png")
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, stream.Length, "foto", "test.png") { Headers = new HeaderDictionary(), ContentType = contentType };
    }

    [Fact]
    public async Task SubirFoto_EmptyUsername_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db);

        var result = await controller.SubirFoto("", MakeFormFile());

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task SubirFoto_EmptyFile_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db);
        var emptyFile = new FormFile(new MemoryStream(), 0, 0, "foto", "empty.png") { Headers = new HeaderDictionary(), ContentType = "image/png" };

        var result = await controller.SubirFoto("admin", emptyFile);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SubirFoto_TooLarge_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db);
        var bigStream = new MemoryStream(new byte[5 * 1024 * 1024 + 1]);
        var bigFile = new FormFile(bigStream, 0, bigStream.Length, "foto", "big.png") { Headers = new HeaderDictionary(), ContentType = "image/png" };

        var result = await controller.SubirFoto("admin", bigFile);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SubirFoto_NotImageContentType_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db);

        var result = await controller.SubirFoto("admin", MakeFormFile(contentType: "application/pdf"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task SubirFoto_UserNotFound_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db);

        var result = await controller.SubirFoto("ghost", MakeFormFile());

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task SubirFoto_UploadServiceThrows_ReturnsServerError()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var mockAvatar = new Mock<IAvatarUploadService>();
        mockAvatar.Setup(m => m.UploadAvatarAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("supabase down"));
        var controller = BuildController(db, mockAvatar.Object);

        var result = await controller.SubirFoto("admin", MakeFormFile());

        var status = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, status.StatusCode);
    }

    [Fact]
    public async Task SubirFoto_Success_UpdatesFotoUrlAndLogs()
    {
        using var db = TestDb.Create();
        var empleado = await SeedEmpleado(db);
        var mockAvatar = new Mock<IAvatarUploadService>();
        mockAvatar.Setup(m => m.UploadAvatarAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync("https://storage.test/avatar.png");
        var controller = BuildController(db, mockAvatar.Object);

        var result = await controller.SubirFoto("admin", MakeFormFile());

        Assert.IsType<OkObjectResult>(result);
        var updated = await db.Empleados.FindAsync(empleado.Id);
        Assert.Equal("https://storage.test/avatar.png", updated!.FotoUrl);
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("SubirFoto", log.Action);
    }

    // ── CambiarPassword ──────────────────────────────────────────────────────

    [Fact]
    public async Task CambiarPassword_EmptyUsername_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db);

        var result = await controller.CambiarPassword(new CambiarPasswordRequest("", "old", "newpass1"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CambiarPassword_UserNotFound_ReturnsUnauthorized()
    {
        using var db = TestDb.Create();
        var controller = BuildController(db);

        var result = await controller.CambiarPassword(new CambiarPasswordRequest("ghost", "old", "newpass1"));

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task CambiarPassword_WrongCurrentPassword_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db);

        var result = await controller.CambiarPassword(new CambiarPasswordRequest("admin", "wrongcurrent", "newpass1"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CambiarPassword_NewPasswordTooShort_ReturnsBadRequest()
    {
        using var db = TestDb.Create();
        await SeedEmpleado(db);
        var controller = BuildController(db);

        var result = await controller.CambiarPassword(new CambiarPasswordRequest("admin", "secret123", "abc"));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CambiarPassword_Success_UpdatesHashAndLogs()
    {
        using var db = TestDb.Create();
        var empleado = await SeedEmpleado(db);
        var controller = BuildController(db);

        var result = await controller.CambiarPassword(new CambiarPasswordRequest("admin", "secret123", "newpassword1"));

        Assert.IsType<OkResult>(result);
        var updated = await db.Empleados.FindAsync(empleado.Id);
        Assert.True(BCrypt.Net.BCrypt.Verify("newpassword1", updated!.PasswordHash));
        var log = await db.ActivityLogs.SingleAsync();
        Assert.Equal("CambiarPassword", log.Action);
    }
}
