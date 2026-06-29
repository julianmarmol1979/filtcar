using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FiltCar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrdenItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrdenItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrdenTrabajoId = table.Column<int>(type: "integer", nullable: false),
                    ArticuloId = table.Column<int>(type: "integer", nullable: false),
                    Cantidad = table.Column<int>(type: "integer", nullable: false),
                    PrecioUnitario = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Subtotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrdenItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrdenItems_Articulos_ArticuloId",
                        column: x => x.ArticuloId,
                        principalTable: "Articulos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrdenItems_OrdenesTrabajo_OrdenTrabajoId",
                        column: x => x.OrdenTrabajoId,
                        principalTable: "OrdenesTrabajo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrdenItems_ArticuloId",
                table: "OrdenItems",
                column: "ArticuloId");

            migrationBuilder.CreateIndex(
                name: "IX_OrdenItems_OrdenTrabajoId",
                table: "OrdenItems",
                column: "OrdenTrabajoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrdenItems");
        }
    }
}
