using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FiltCar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFotoUrlToEmpleado : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FotoUrl",
                table: "Empleados",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FotoUrl",
                table: "Empleados");
        }
    }
}
