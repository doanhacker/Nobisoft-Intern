using indexing_worker;
using indexing_worker.Services;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddHttpClient();
builder.Services.AddSingleton<ImageProcessor>();
builder.Services.AddSingleton<DataSeeder>();

// Nếu có argument --seed thì chạy DataSeeder rồi thoát
if (args.Contains("--seed"))
{
    var shouldClear = args.Contains("--clear");
    var host = builder.Build();
    var seeder = host.Services.GetRequiredService<DataSeeder>();
    await seeder.RunAsync(shouldClear, CancellationToken.None);
    return;
}

builder.Services.AddHostedService<Worker>();

var app = builder.Build();
app.Run();
