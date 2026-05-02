namespace FiltCar.Api.Models;

public enum UserRole
{
    Admin,
    EmpleadoAdmin,
    EmpleadoVentas
}

public enum PaymentMethod
{
    Contado,
    Tarjeta,
    Deposito,
    Deuda
}

public enum CajaMovimientoTipo
{
    Apertura,
    Cierre,
    Arqueo,
    Retiro,
    Ingreso
}
