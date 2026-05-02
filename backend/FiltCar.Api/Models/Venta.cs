namespace FiltCar.Api.Models;

public class Venta
{
    public int Id { get; set; }
    public int? ClienteId { get; set; }
    public Cliente? Cliente { get; set; }
    public int EmpleadoId { get; set; }
    public Empleado Empleado { get; set; } = null!;
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public decimal Total { get; set; }
    public decimal Descuento { get; set; }
    public PaymentMethod FormaPago { get; set; }
    public decimal MontoPagado { get; set; }
    public decimal SaldoPendiente { get; set; }

    public ICollection<VentaItem> Items { get; set; } = new List<VentaItem>();
    public DeudaCliente? DeudaGenerada { get; set; }
}

public class VentaItem
{
    public int Id { get; set; }
    public int VentaId { get; set; }
    public Venta Venta { get; set; } = null!;
    public int ArticuloId { get; set; }
    public Articulo Articulo { get; set; } = null!;
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal { get; set; }
}
