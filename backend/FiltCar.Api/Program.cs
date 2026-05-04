using FiltCar.Api.Data;
using FiltCar.Api.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

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
}

app.Run();

static void SeedAdmin(AppDbContext db)
{
    var admin = db.Empleados.FirstOrDefault(e => e.Username == "admin");
    if (admin is null)
    {
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
    }
    else
    {
        // Reset password on every deploy to keep it in sync
        admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("filtcar2026", 11);
    }
    db.SaveChanges();
}
