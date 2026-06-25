using FiltCar.Api.Data;
using FiltCar.Api.Models;

namespace FiltCar.Api.Services;

public class ActivityLogger(AppDbContext db)
{
    public void Log(string? username, string action, string description)
    {
        db.ActivityLogs.Add(new ActivityLog
        {
            Username = string.IsNullOrWhiteSpace(username) ? "Sistema" : username,
            Action = action,
            Description = description,
        });
    }
}
