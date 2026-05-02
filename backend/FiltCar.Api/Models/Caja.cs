namespace FiltCar.Api.Models;

public class CajaMovimiento
{
    public int Id { get; set; }
    public CajaMovimientoTipo Tipo { get; set; }
    public decimal Monto { get; set; }
    public string? Observacion { get; set; }
    public int EmpleadoId { get; set; }
    public Empleado Empleado { get; set; } = null!;
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}
