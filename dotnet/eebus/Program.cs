using EEBUS;

namespace eebus
{
    internal class Program
    {
        static MDNSService StartmDNS(string id, string ski)
        {
            var mDns = new MDNSService(id);
            mDns.AddProperty("txtvers", "1");
            mDns.AddProperty("id", id);
            mDns.AddProperty("register", "false");
            mDns.AddProperty("path", "/ship/");
            mDns.AddProperty("ski", ski);
            mDns.Run();
            return mDns;
        }

        static async Task Main(string[] args)
        {
            var id = "EEBUS-Client";

            var clientCert = CertificateHelper.GenerateCert(id);
            var ski = CertificateHelper.GetSubjectKeyIdentifier(clientCert);

            Console.WriteLine("SKI: " + ski);

            return;

            var mDns = StartmDNS(id, ski);

            Console.ReadKey();
            var ship = new SHIP("192.168.0.68", 12480, clientCert);
            await ship.ConnectAsync();
            Console.WriteLine("WSS connected");

            var initRes = await ship.X01_InitAsync();
            if (!initRes)
            {
                Console.WriteLine("SHIP.01_Init failed");
                return;
            }
            else
            {
                Console.WriteLine("SHIP.01_Init success");
            }

            var helloRes = await ship.X02_HelloAsync();
            if (!helloRes)
            {
                Console.WriteLine("SHIP.02_Hello failed");
                return;
            }
            else
            {
                Console.WriteLine("SHIP.02_Hello success");
            }

            var handshakeRes = await ship.X03_HandshakeAsync();
            if (!handshakeRes)
            {
                Console.WriteLine("SHIP.03_Handshake failed");
            }
            else
            {
                Console.WriteLine("SHIP.03.Handshake success");
            }

            Console.ReadLine();

        }
    }
}
