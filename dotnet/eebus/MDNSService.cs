
using Makaretu.Dns;

namespace EEBUS
{
    public class MDNSService
    {
        private readonly ServiceProfile _serviceProfile;

        public MDNSService(string instanceName)
        {
            this._serviceProfile = new ServiceProfile(instanceName, "_ship._tcp", 50000);
        }

        public void AddProperty(string key, string value)
        {
            _serviceProfile.AddProperty(key, value);
        }

        public Task Run()
        {
            return Task.Run(async () =>
            {
                Thread.CurrentThread.IsBackground = true;

                MulticastService mdns = new MulticastService();
                /*mdns.QueryReceived += (s, e) =>
                {
                    var names = e.Message.Questions
                        .Select(q => q.Name + " " + q.Type);
                    Console.WriteLine($"got a query for {String.Join(", ", names)}");
                };
                mdns.AnswerReceived += (s, e) =>
                {
                    var names = e.Message.Answers
                        .Select(q => q.Name + " " + q.Type)
                        .Distinct();
                    Console.WriteLine($"got answer for {String.Join(", ", names)}");
                };
                mdns.NetworkInterfaceDiscovered += (s, e) =>
                {
                    foreach (var nic in e.NetworkInterfaces)
                    {
                        Console.WriteLine($"discovered NIC '{nic.Name}'");
                    }
                };*/

                ServiceDiscovery sd = new ServiceDiscovery(mdns);
                try
                {
                    mdns.Start();

                    if (!sd.Probe(this._serviceProfile))
                    {
                        sd.Advertise(this._serviceProfile);
                        sd.Announce(this._serviceProfile);
                        Console.WriteLine("mDNS running");
                    }
                    else
                    {
                        Console.WriteLine("mDNS - something went wrong");
                    }

                    await Task.Delay(-1);
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex.Message);
                }
                finally
                {
                    Console.WriteLine("mDNS stopped");
                    sd.Dispose();
                    mdns.Stop();
                }
            });
        }
    }
}
