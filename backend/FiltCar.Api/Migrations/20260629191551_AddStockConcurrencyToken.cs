using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FiltCar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStockConcurrencyToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // No-op a propósito: "xmin" es una columna de sistema que Postgres ya mantiene en
            // cada fila. Solo la mapeamos como token de concurrencia optimista (ver AppDbContext).
            // No hay nada que crear en la base; esta migración solo mantiene el snapshot del modelo.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
