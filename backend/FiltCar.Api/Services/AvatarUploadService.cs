using System.Net.Http.Headers;
using System.Text.RegularExpressions;

namespace FiltCar.Api.Services;

public class AvatarUploadService(IHttpClientFactory httpClientFactory, IConfiguration config) : IAvatarUploadService
{
    private string? SupabaseUrl => config["Supabase:Url"];
    private string? SupabaseKey => config["Supabase:ServiceKey"];
    private string StorageBucket => config["Supabase:Bucket"] ?? "filtcar-avatars";

    public async Task<string> UploadAvatarAsync(Stream fileStream, string fileName, string contentType)
    {
        var supabaseUrl = SupabaseUrl ?? throw new InvalidOperationException("Supabase:Url not configured.");
        var supabaseKey = SupabaseKey ?? throw new InvalidOperationException("Supabase:ServiceKey not configured.");

        var safeName = $"avatars/{DateTime.UtcNow:yyyyMMddHHmmssfff}_{SanitizeFileName(fileName)}";
        var uploadUrl = $"{supabaseUrl}/storage/v1/object/{StorageBucket}/{safeName}";

        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("apikey", supabaseKey);
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

        using var content = new StreamContent(fileStream);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        var response = await client.PostAsync(uploadUrl, content);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Supabase upload failed ({(int)response.StatusCode}): {body}");

        return $"{supabaseUrl}/storage/v1/object/public/{StorageBucket}/{safeName}";
    }

    private static string SanitizeFileName(string fileName)
    {
        var name = Path.GetFileName(fileName);
        return Regex.Replace(name, @"[^a-zA-Z0-9._-]", "_");
    }
}
