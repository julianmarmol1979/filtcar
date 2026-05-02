FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["backend/FiltCar.Api/FiltCar.Api.csproj", "FiltCar.Api/"]
RUN dotnet restore "FiltCar.Api/FiltCar.Api.csproj"
COPY backend/FiltCar.Api/ FiltCar.Api/
WORKDIR "/src/FiltCar.Api"
RUN dotnet publish "FiltCar.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "FiltCar.Api.dll"]
