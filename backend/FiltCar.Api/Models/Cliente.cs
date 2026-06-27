namespace FiltCar.Api.Models;

public class Cliente
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? Direccion { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;

    public ICollection<Venta> Ventas { get; set; } = new List<Venta>();
    public ICollection<DeudaCliente> Deudas { get; set; } = new List<DeudaCliente>();
    public ICollection<Auto> Autos { get; set; } = new List<Auto>();
    public ICollection<OrdenTrabajo> Ordenes { get; set; } = new List<OrdenTrabajo>();
}
