using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Net;

namespace LogViewer.Server
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Booting LogViewer.Server");
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args)
        {
            // NOT using 'Host.CreateDefaultBuilder(args)' / 'WebHost.CreateDefaultBuilder(args)'
            // As this lives in the assembly/nuget 'Microsoft.AspNetCore'
            // Which means we reference way toooooo much & get the OpenSSL issue on MacOS for AppStore submissions
            // So manually copy over what we needed from the helper method :)
            var hostBuilder = new HostBuilder();
            hostBuilder
                .ConfigureWebHost(webHostBuilder =>
                {
                    webHostBuilder
                        .UseKestrel((context, options) =>
                        {
                            options.Configure(context.Configuration.GetSection("Kestrel"));
                        })
                        .UseStartup<Startup>()
                        .ConfigureKestrel((context, options) =>
                        {
                            options.Listen(IPAddress.Loopback, 45678);
                        });
                })
                .ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.AddConsole();
                });

            return hostBuilder;
        }
    }
}
