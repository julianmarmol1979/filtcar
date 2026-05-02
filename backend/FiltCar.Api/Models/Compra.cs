namespace FiltCar.Api.Models;

public class Compra
{
    public int Id { get; set; }
    public int ProveedorId { get; set; }
    public Proveedor Proveedor { get; set; } = null!;
    public int EmpleadoId { get; set; }
    public Empleado Empleado { get; set; } = null!;
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public decimal Total { get; set; }
    public bool PagoInmediato { get; set; }
    public decimal MontoPagado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public bool Cancelada { get; set; }

    public ICollection<CompraItem> Items { get; set; } = new List<CompraItem>();
    public ICollection<PagoProveedor> Pagos { get; set; } = new List<PagoProveedor>();
}

public class CompraItem
{
    public int Id { get; set; }
    public int CompraId { get; set; }
    public Compra Compra { get; set; } = null!;
    public int ArticuloId { get; set; }
    public Articulo Articulo { get; set; } = null!;
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal { get; set; }
}

public class PagoProveedor
{
    public int Id { get; set; }
    public int CompraId { get; set; }
    public Compra Compra { get; set; } = null!;
    public decimal Monto { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public int EmpleadoId { get; set; }
    public Empleado Empleado { get; set; } = null!;
}
