namespace FiltCar.Api.Models;

public class Auto
{
    public int Id { get; set; }
    public int ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    public string Patente { get; set; } = string.Empty;
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public string? Anio { get; set; }
    public string? Color { get; set; }
    public int? Kilometraje { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    public ICollection<OrdenTrabajo> Ordenes { get; set; } = new List<OrdenTrabajo>();
}
