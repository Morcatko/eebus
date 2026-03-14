using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace eebus
{
    public class CertificateHelper
    {
        public static X509Certificate2 GenerateCert(string subject)
        {
            string path = Path.Combine(Directory.GetCurrentDirectory(), subject + ".pfx");
            string password = string.Empty;

            if (File.Exists(path))
            {
                return new X509Certificate2(path);
            }
            else
            {
                // generate a new cert request with ECC and NIST curve P256 (TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256, EEBUS requirement)
                CertificateRequest request = new CertificateRequest("cn=" + subject, ECDsa.Create(ECCurve.NamedCurves.nistP256), HashAlgorithmName.SHA256);

                // add Subject Key Identifier (EEBUS requirement)
                request.CertificateExtensions.Add(new X509SubjectKeyIdentifierExtension(request.PublicKey, false));

                // add DNS name and localhost IP address also as Subject Alternate Name
                SubjectAlternativeNameBuilder subjectAlternativeNameBuilder = new SubjectAlternativeNameBuilder();
                subjectAlternativeNameBuilder.AddDnsName(subject);
                request.CertificateExtensions.Add(subjectAlternativeNameBuilder.Build());

                // add key usage
                request.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DataEncipherment | X509KeyUsageFlags.KeyEncipherment | X509KeyUsageFlags.DigitalSignature, false));

                // create cert
                X509Certificate2 cert = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddSeconds(-5), DateTimeOffset.UtcNow.AddYears(10));

                // persist the cert
                File.WriteAllBytes(path, cert.Export(X509ContentType.Pfx, password));

                return new X509Certificate2(path);
            }
        }

        public static string GetSubjectKeyIdentifier(X509Certificate2 cert)
        {
            // Find the SKI extension in the certificate
            var skiExtension = cert.Extensions
                .OfType<X509SubjectKeyIdentifierExtension>()
                .FirstOrDefault();

            if (skiExtension != null)
            {
                return skiExtension.SubjectKeyIdentifier.ToLower();
            }

            // Fallback: Manually calculate SHA1 of the public key if extension is missing
            using var sha1 = SHA1.Create();
            var hash = sha1.ComputeHash(cert.PublicKey.EncodedKeyValue.RawData);
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }
    }

}
