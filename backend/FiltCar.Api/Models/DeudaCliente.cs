namespace FiltCar.Api.Models;

public class DeudaCliente
{
    public int Id { get; set; }
    public int ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    public int VentaId { get; set; }
    public Venta Venta { get; set; } = null!;
    public decimal MontoOriginal { get; set; }
    public decimal MontoPagado { get; set; }
    public decimal SaldoPendiente { get; set; }
    public bool Cancelada { get; set; }
    public DateTime CreadaEn { get; set; } = DateTime.UtcNow;

    public ICollection<PagoDeudaCliente> Pagos { get; set; } = new List<PagoDeudaCliente>();
}

public class PagoDeudaCliente
{
    public int Id { get; set; }
    public int DeudaClienteId { get; set; }
    public DeudaCliente DeudaCliente { get; set; } = null!;
    public decimal Monto { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public int EmpleadoId { get; set; }
    public Empleado Empleado { get; set; } = null!;
}
