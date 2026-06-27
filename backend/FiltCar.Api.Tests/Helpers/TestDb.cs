using FiltCar.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Tests.Helpers;

// SQLite in-memory (not the EF InMemory provider) because several controllers
// use db.Database.BeginTransactionAsync(), which the EF InMemory provider
// does not support. Each call opens its own isolated in-memory database.
public static class TestDb
{
    public static AppDbContext Create()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var db = new AppDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }
}
