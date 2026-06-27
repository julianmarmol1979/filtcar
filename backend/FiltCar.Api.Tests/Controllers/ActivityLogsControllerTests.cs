using FiltCar.Api.Controllers;
using FiltCar.Api.Models;
using FiltCar.Api.Tests.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace FiltCar.Api.Tests.Controllers;

public class ActivityLogsControllerTests
{
    [Fact]
    public async Task GetAll_NoFilters_ReturnsAllOrderedByMostRecent()
    {
        using var db = TestDb.Create();
        db.ActivityLogs.AddRange(
            new ActivityLog { Username = "admin", Action = "Login", Description = "a", CreatedAt = DateTime.UtcNow.AddMinutes(-10) },
            new ActivityLog { Username = "admin", Action = "Login", Description = "b", CreatedAt = DateTime.UtcNow }
        );
        await db.SaveChangesAsync();
        var controller = new ActivityLogsController(db);

        var result = await controller.GetAll(null, null, 1, 25);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"total\":2", json);
        // Most recent ("b") should appear before the older one ("a")
        Assert.True(json.IndexOf("\"b\"") < json.IndexOf("\"a\""));
    }

    [Fact]
    public async Task GetAll_FiltersByDateRange()
    {
        using var db = TestDb.Create();
        db.ActivityLogs.AddRange(
            new ActivityLog { Username = "admin", Action = "Login", Description = "old", CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new ActivityLog { Username = "admin", Action = "Login", Description = "new", CreatedAt = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
        await db.SaveChangesAsync();
        var controller = new ActivityLogsController(db);

        var result = await controller.GetAll(new DateOnly(2026, 5, 1), new DateOnly(2026, 12, 31), 1, 25);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"total\":1", json);
        Assert.Contains("\"new\"", json);
        Assert.DoesNotContain("\"old\"", json);
    }

    [Fact]
    public async Task GetAll_ClampsPageAndPageSize()
    {
        using var db = TestDb.Create();
        for (var i = 0; i < 5; i++)
            db.ActivityLogs.Add(new ActivityLog { Username = "admin", Action = "Login", Description = $"log{i}" });
        await db.SaveChangesAsync();
        var controller = new ActivityLogsController(db);

        var result = await controller.GetAll(null, null, page: 0, pageSize: 1000);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"page\":1", json);
        Assert.Contains("\"pageSize\":100", json);
    }

    [Fact]
    public async Task GetAll_Pagination_ReturnsCorrectSlice()
    {
        using var db = TestDb.Create();
        for (var i = 0; i < 5; i++)
            db.ActivityLogs.Add(new ActivityLog { Username = "admin", Action = "Login", Description = $"log{i}", CreatedAt = DateTime.UtcNow.AddMinutes(-i) });
        await db.SaveChangesAsync();
        var controller = new ActivityLogsController(db);

        var result = await controller.GetAll(null, null, page: 2, pageSize: 2);

        var ok = Assert.IsType<OkObjectResult>(result);
        var json = System.Text.Json.JsonSerializer.Serialize(ok.Value);
        Assert.Contains("\"total\":5", json);
    }
}
