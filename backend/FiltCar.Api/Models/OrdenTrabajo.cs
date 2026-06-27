namespace FiltCar.Api.Models;

public class OrdenTrabajo
{
    public int Id { get; set; }
    public int ClienteId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    public int AutoId { get; set; }
    public Auto Auto { get; set; } = null!;
    public int? EmpleadoId { get; set; }
    public Empleado? Empleado { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string Estado { get; set; } = "Pendiente"; // Pendiente | EnProceso | Completada | Cancelada
    public string Motivo { get; set; } = string.Empty; // why the car came in (free text, any taller job — not just oil change)
    public int? KilometrajeIngreso { get; set; }
    public string? Observaciones { get; set; }
    public DateTime CreadaEn { get; set; } = DateTime.UtcNow;
    public DateTime? FinalizadaEn { get; set; }

    public ICollection<OrdenChecklistItem> ChecklistItems { get; set; } = new List<OrdenChecklistItem>();
}

public class OrdenChecklistItem
{
    public int Id { get; set; }
    public int OrdenTrabajoId { get; set; }
    public OrdenTrabajo OrdenTrabajo { get; set; } = null!;
    public string Descripcion { get; set; } = string.Empty;
    public bool? Respuesta { get; set; } // null = sin revisar, true = Sí, false = No
    public int Posicion { get; set; }
}
