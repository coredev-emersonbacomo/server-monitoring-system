using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace MonitorAgent;

public class AgentClient
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _jsonOptions;

    public AgentClient()
    {
        _http = new HttpClient();
        _http.Timeout = TimeSpan.FromSeconds(15);

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            PropertyNameCaseInsensitive = true,
        };
    }

    public async Task<RegisterResponse> RegisterAsync(string registerUrl, RegisterRequest request)
    {
        var response = await _http.PostAsJsonAsync(registerUrl, request, _jsonOptions);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<RegisterResponse>(_jsonOptions);
        return result ?? throw new InvalidOperationException("Registration returned null response");
    }

    public async Task<HeartbeatResponse> SendHeartbeatAsync(
        string heartbeatUrl,
        string identityToken,
        HeartbeatRequest payload)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, heartbeatUrl)
        {
            Content = JsonContent.Create(payload, options: _jsonOptions),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", identityToken);

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<HeartbeatResponse>(_jsonOptions);
        return result ?? new HeartbeatResponse();
    }

    public string ExecuteCommand(AgentCommand cmd)
    {
        if (cmd.Type != "shell")
            return "Command type not supported: " + cmd.Type;

        var cmdStr = "echo Command acknowledged";
        if (cmd.Payload?.TryGetValue("command", out var val) == true)
            cmdStr = val?.ToString() ?? cmdStr;

        try
        {
            var psi = new ProcessStartInfo("cmd.exe", "/c " + cmdStr)
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            using var proc = System.Diagnostics.Process.Start(psi);
            var output = proc?.StandardOutput.ReadToEnd() ?? "";
            var error = proc?.StandardError.ReadToEnd() ?? "";
            proc?.WaitForExit(30000);

            return string.IsNullOrEmpty(error) ? output.Trim() : output.Trim() + "\nSTDERR: " + error.Trim();
        }
        catch (Exception ex)
        {
            return "Error: " + ex.Message;
        }
    }
}
