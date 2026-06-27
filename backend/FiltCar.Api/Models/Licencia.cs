namespace FiltCar.Api.Models;

public class Licencia
{
    public int Id { get; set; }
    public string Plan { get; set; } = "Premium";
    public int? MaxUsuarios { get; set; }
    public DateTime? FechaVencimiento { get; set; }
    public bool Activa { get; set; } = true;
    public DateTime ActualizadoEn { get; set; } = DateTime.UtcNow;
}
