using FiltCar.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FiltCar.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<Articulo> Articulos => Set<Articulo>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Proveedor> Proveedores => Set<Proveedor>();
    public DbSet<Venta> Ventas => Set<Venta>();
    public DbSet<VentaItem> VentaItems => Set<VentaItem>();
    public DbSet<DeudaCliente> DeudasClientes => Set<DeudaCliente>();
    public DbSet<PagoDeudaCliente> PagosDeudaCliente => Set<PagoDeudaCliente>();
    public DbSet<Compra> Compras => Set<Compra>();
    public DbSet<CompraItem> CompraItems => Set<CompraItem>();
    public DbSet<PagoProveedor> PagosProveedor => Set<PagoProveedor>();
    public DbSet<CajaMovimiento> CajaMovimientos => Set<CajaMovimiento>();
    public DbSet<Presupuesto> Presupuestos => Set<Presupuesto>();
    public DbSet<PresupuestoItem> PresupuestoItems => Set<PresupuestoItem>();
    public DbSet<Turno> Turnos => Set<Turno>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Articulo>()
            .Property(a => a.Precio)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Venta>()
            .Property(v => v.Total).HasPrecision(18, 2);
        modelBuilder.Entity<Venta>()
            .Property(v => v.Descuento).HasPrecision(18, 2);
        modelBuilder.Entity<Venta>()
            .Property(v => v.MontoPagado).HasPrecision(18, 2);
        modelBuilder.Entity<Venta>()
            .Property(v => v.SaldoPendiente).HasPrecision(18, 2);

        modelBuilder.Entity<VentaItem>()
            .Property(vi => vi.PrecioUnitario).HasPrecision(18, 2);
        modelBuilder.Entity<VentaItem>()
            .Property(vi => vi.Subtotal).HasPrecision(18, 2);

        modelBuilder.Entity<DeudaCliente>()
            .Property(d => d.MontoOriginal).HasPrecision(18, 2);
        modelBuilder.Entity<DeudaCliente>()
            .Property(d => d.MontoPagado).HasPrecision(18, 2);
        modelBuilder.Entity<DeudaCliente>()
            .Property(d => d.SaldoPendiente).HasPrecision(18, 2);

        modelBuilder.Entity<PagoDeudaCliente>()
            .Property(p => p.Monto).HasPrecision(18, 2);

        modelBuilder.Entity<Compra>()
            .Property(c => c.Total).HasPrecision(18, 2);
        modelBuilder.Entity<Compra>()
            .Property(c => c.MontoPagado).HasPrecision(18, 2);
        modelBuilder.Entity<Compra>()
            .Property(c => c.SaldoPendiente).HasPrecision(18, 2);

        modelBuilder.Entity<CompraItem>()
            .Property(ci => ci.PrecioUnitario).HasPrecision(18, 2);
        modelBuilder.Entity<CompraItem>()
            .Property(ci => ci.Subtotal).HasPrecision(18, 2);

        modelBuilder.Entity<PagoProveedor>()
            .Property(p => p.Monto).HasPrecision(18, 2);

        modelBuilder.Entity<CajaMovimiento>()
            .Property(c => c.Monto).HasPrecision(18, 2);

        modelBuilder.Entity<Presupuesto>()
            .Property(p => p.Total).HasPrecision(18, 2);
        modelBuilder.Entity<PresupuestoItem>()
            .Property(pi => pi.PrecioUnitario).HasPrecision(18, 2);
        modelBuilder.Entity<PresupuestoItem>()
            .Property(pi => pi.Subtotal).HasPrecision(18, 2);

    }
}
