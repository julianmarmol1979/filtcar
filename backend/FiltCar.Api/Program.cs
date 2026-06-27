using FiltCar.Api.Data;
using FiltCar.Api.Models;
using FiltCar.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IAvatarUploadService, AvatarUploadService>();
builder.Services.AddScoped<ActivityLogger>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var rawOrigins = builder.Configuration["AllowedOrigins"] ?? "http://localhost:3000";
var allowedOrigins = rawOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    SeedAdmin(db);
    SeedLicencia(db);
}

app.Run();

static void SeedLicencia(AppDbContext db)
{
    // Arranca sin restricciones (sin vencimiento, sin tope de usuarios) hasta que Skylia
    // configure el plan real vía PUT /api/internal/licencia. Así nunca se bloquea sola
    // una instalación nueva por falta de configuración.
    if (db.Licencias.Any()) return;

    db.Licencias.Add(new Licencia
    {
        Plan = "Premium",
        MaxUsuarios = null,
        FechaVencimiento = null,
        Activa = true,
        ActualizadoEn = DateTime.UtcNow
    });
    db.SaveChanges();
}

static void SeedAdmin(AppDbContext db)
{
    // Only create the admin user if it doesn't exist yet — never touch an existing
    // admin's password here, otherwise every redeploy/restart would silently
    // overwrite whatever password the user has set since.
    var exists = db.Empleados.Any(e => e.Username == "admin");
    if (exists) return;

    db.Empleados.Add(new Empleado
    {
        Nombre = "Admin",
        Apellido = "FiltCar",
        Username = "admin",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("filtcar2026", 11),
        Rol = UserRole.Admin,
        Activo = true,
        CreadoEn = DateTime.UtcNow
    });
    db.SaveChanges();
}
