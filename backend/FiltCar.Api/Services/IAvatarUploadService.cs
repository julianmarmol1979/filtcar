namespace FiltCar.Api.Services;

public interface IAvatarUploadService
{
    Task<string> UploadAvatarAsync(Stream fileStream, string fileName, string contentType);
}
