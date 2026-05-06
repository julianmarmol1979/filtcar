namespace FiltCar.Api.Models;

public class Turno
{
    public int      Id              { get; set; }
    public DateTime Fecha           { get; set; }           // date + time of appointment
    public string?  ClienteNombre   { get; set; }           // free-text name for walk-ins
    public int?     ClienteId       { get; set; }
    public Cliente? Cliente         { get; set; }
    public string?  Telefono        { get; set; }
    public string?  Vehiculo        { get; set; }           // plate or description
    public string   Servicio        { get; set; } = "";
    public string?  Observacion     { get; set; }
    public int?     EmpleadoId      { get; set; }
    public Empleado? Empleado       { get; set; }
    public string   Estado          { get; set; } = "Pendiente"; // Pendiente | Confirmado | Completado | Cancelado
    public DateTime CreadaEn        { get; set; } = DateTime.UtcNow;
}
