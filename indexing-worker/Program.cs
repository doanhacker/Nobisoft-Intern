using indexing_worker;
using indexing_worker.Services;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddHttpClient();
builder.Services.AddSingleton<ImageProcessor>();
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
