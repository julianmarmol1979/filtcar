namespace FiltCar.Api.Models;

public class Presupuesto
{
    public int Id { get; set; }
    public int? ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
    public int EmpleadoId { get; set; }
    public Empleado Empleado { get; set; } = null!;
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public DateTime Vencimiento { get; set; }
    public decimal Total { get; set; }
    public string? Observacion { get; set; }

    public ICollection<PresupuestoItem> Items { get; set; } = new List<PresupuestoItem>();
}

public class PresupuestoItem
{
    public int Id { get; set; }
    public int PresupuestoId { get; set; }
    public Presupuesto Presupuesto { get; set; } = null!;
    public int ArticuloId { get; set; }
    public Articulo Articulo { get; set; } = null!;
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal { get; set; }
}
