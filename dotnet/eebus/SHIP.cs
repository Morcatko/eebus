using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;
using System.Net.Security;
using System.Net.WebSockets;
using System.Reflection;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace eebus
{
    internal class SHIP
    {
		public class ObjectToPropertyArrayConverter : JsonConverter
		{
			public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
			{
                JToken t = JToken.FromObject(value);

                if (t.Type == JTokenType.Object)
                {
                    writer.WriteStartArray();

                    var properties = value.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance);

                    foreach (var prop in properties)
                    {
                        var propValue = prop.GetValue(value);
						if (!prop.PropertyType.IsArray  && (propValue == null || Equals(propValue, Activator.CreateInstance(prop.PropertyType))))
							continue;

						writer.WriteStartObject();
                        writer.WritePropertyName(
                            serializer.ContractResolver.ResolveContract(prop.PropertyType)
                                .Converter == null
                                ? prop.Name.Substring(0, 1).ToLower() + prop.Name.Substring(1)
                                : prop.Name
                        );

                        serializer.Serialize(writer, propValue);
                        writer.WriteEndObject();
                    }

                    writer.WriteEndArray();
                }
                else
                {
					t.WriteTo(writer);
				}
			}

			public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
			{
				var jtok = JToken.Load(reader);

                if (jtok.Type == JTokenType.Array)
                {
				    var obj = Activator.CreateInstance(objectType);
                    var array = jtok as JArray;
                    foreach (var item in array)
                    {
                        foreach (var property in item.Children<JProperty>())
                        {
                            var propInfo = objectType.GetProperty(
                                property.Name,
                                BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance);

                            if (propInfo != null)
                            {
                                var value = property.Value.ToObject(propInfo.PropertyType, serializer);
                                propInfo.SetValue(obj, value);
                            }
                        }
                    }
                    return obj;
                }
                else
                {
					var converters = serializer.Converters;
					var thisConverter = converters.FirstOrDefault(c => c is ObjectToPropertyArrayConverter);

					if (thisConverter != null)
						converters.Remove(thisConverter);

					try
					{
						// Call default deserialization
						return serializer.Deserialize(reader, objectType);
					}
					finally
					{
						if (thisConverter != null)
							converters.Add(thisConverter);
					}
				}
			}

			public override bool CanConvert(Type objectType)
			{
                return !objectType.IsEnum;
			}
		}


		private readonly string _ip;
        private readonly int _port;
        private readonly ClientWebSocket _wsClient;

        private readonly JsonSerializerSettings deserializerSettings = new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Include,
            MissingMemberHandling = MissingMemberHandling.Error,
			Converters = new List<JsonConverter>() { new ObjectToPropertyArrayConverter(), new StringEnumConverter() }
		};

        private readonly JsonSerializerSettings serializerSettings = new JsonSerializerSettings
        {
            DefaultValueHandling = DefaultValueHandling.Ignore,
            Converters = new List<JsonConverter>() { new ObjectToPropertyArrayConverter(), new StringEnumConverter() }
        };

        public SHIP(string ip, int port, X509Certificate2 clientCert)
        {
            _ip = ip;
            _port = port;
            _wsClient = new ClientWebSocket();
            _wsClient.Options.AddSubProtocol("ship");
            _wsClient.Options.RemoteCertificateValidationCallback = ValidateServerCert;
            _wsClient.Options.ClientCertificates.Add(clientCert);
        }

        private bool ValidateServerCert(object sender, X509Certificate certificate, X509Chain chain, SslPolicyErrors sslPolicyErrors)
        {
            // extract SKI
            foreach (X509Extension extension in ((X509Certificate2)certificate).Extensions)
            {
                if (extension.Oid.FriendlyName == "Subject Key Identifier")
                {
                    X509SubjectKeyIdentifierExtension ext = (X509SubjectKeyIdentifierExtension)extension;
                    Console.WriteLine("Server SKI: " + ext.SubjectKeyIdentifier);
                    break;
                }
            }

            return true;
        }

        public async Task ConnectAsync()
        {
            await _wsClient.ConnectAsync(new Uri($"wss://{_ip}:{_port}"), CancellationToken.None);
        }

        private T DeserializeMessage<T>(byte[] data)
        {
            var str = "[" + Encoding.UTF8.GetString(data) + "]";
            Console.WriteLine("Received: " + str);
            return JsonConvert.DeserializeObject<T>(str, deserializerSettings);
        }

        private async Task SendMessage(byte[] data)
        {
            await _wsClient.SendAsync(new ArraySegment<byte>(data), WebSocketMessageType.Binary, WebSocketMessageFlags.DisableCompression | WebSocketMessageFlags.EndOfMessage, default);
        }

        private async Task SendMessage<T>(byte[] prefix, T message)
        {
            var messageString = JsonConvert.SerializeObject(message, serializerSettings);
            messageString = messageString.TrimStart('[').TrimEnd(']');
            Console.WriteLine("Sending message:" + messageString);
            byte[] messageSerialized = Encoding.UTF8.GetBytes(messageString); ;
            byte[] datagramBuffer = new byte[messageSerialized.Length + prefix.Length];

            Buffer.BlockCopy(prefix, 0, datagramBuffer, 0, prefix.Length);
            Buffer.BlockCopy(messageSerialized, 0, datagramBuffer, prefix.Length, messageSerialized.Length);

            await SendMessage(datagramBuffer);
        }

        private Task SendMessage<T>(byte messageType, T message)
            => SendMessage([messageType], message);

        private async Task<T> ReceiveMessage<T>(byte expectedMessageType)
        {
            byte[] response = new byte[1024];
            WebSocketReceiveResult result = await _wsClient.ReceiveAsync(response, new CancellationTokenSource(SHIPMessageTimeout.T_HELLO_INIT).Token);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                Console.WriteLine("Websocket connection remotely closed");
                throw new Exception("Websocket connection closed");
            }

            if ((result.Count < 2) || (response[0] != expectedMessageType))
            {
                throw new Exception("Unexpected message type");
            }

            byte[] messageBuffer = new byte[result.Count - 1];
            Buffer.BlockCopy(response, 1, messageBuffer, 0, result.Count - 1);

            var receivedObject = DeserializeMessage<T>(messageBuffer);
            if (receivedObject == null)
            {
                throw new Exception("Received object parsing failed!");
            }
            return receivedObject;
        }

        public async Task<Boolean> X01_InitAsync()
        {
            var initRequest = new byte[2] { SHIPMessageType.INIT, SHIPMessageValue.CMI_HEAD };
            await SendMessage(initRequest);

            // wait for init response message from server
            var initResponse = new byte[2];
            WebSocketReceiveResult result = await _wsClient.ReceiveAsync(initResponse, new CancellationTokenSource(SHIPMessageTimeout.CMI_TIMEOUT).Token).ConfigureAwait(false);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                return false;
            }

            if ((initResponse[0] != SHIPMessageType.INIT) || (initResponse[1] != SHIPMessageValue.CMI_HEAD))
            {
                throw new Exception("SHIP 01_Init: Expected init response message!");
            }
            return true;
        }

        public async Task<Boolean> X02_HelloAsync()
        {
            async Task X02_SendHelloMessage(ConnectionHelloPhaseType phase)
            {
                SHIPHelloMessage helloMessage = new SHIPHelloMessage();
                helloMessage.connectionHello.phase = phase;
                await SendMessage(SHIPMessageType.CONTROL, helloMessage);
            }

            await X02_SendHelloMessage(ConnectionHelloPhaseType.ready);

            // wait for hello response message from server
            bool helloPhase = true;
            int numProlongsReceived = 0;
            while (helloPhase)
            {
                var helloMessageReceived = await ReceiveMessage<SHIPHelloMessage>(SHIPMessageType.CONTROL);
                var phase = helloMessageReceived.connectionHello.phase.Value;
                switch (phase)
                {
                    case ConnectionHelloPhaseType.ready:
                        return true;

                    case ConnectionHelloPhaseType.aborted:
                        return false;

                    case ConnectionHelloPhaseType.pending:
                        return false;
                        /*if (helloMessageReceived.connectionHello].prolongationRequestSpecified)
                        {
                            // the server needs more time, send a hello update message
                            numProlongsReceived++;
                            if (numProlongsReceived > 2)
                            {
                                throw new Exception("More than 2 prolong requests received, aborting!");
                            }

                            await _wsClient.SendAsync(helloMessageBuffer, WebSocketMessageType.Binary, true, new CancellationTokenSource(SHIPMessageTimeout.T_HELLO_PROLONG_WAITING_GAP).Token).ConfigureAwait(false);
                        }*/

                        break;

                    default:
                        {
                            //TODO: Send client abort message incase of failure
                            throw new Exception("Invalid hello sub-state received!");
                        }
                }
            }
            return false;
        }

        public async Task<Boolean> X03_HandshakeAsync()
        {
            try
            {
				
                // send protocol handshake message
                SHIPHandshakeMessage handshakeMessage = new SHIPHandshakeMessage();
                handshakeMessage.messageProtocolHandshake.handshakeType = ProtocolHandshakeTypeType.announceMax;
                handshakeMessage.messageProtocolHandshake.version = new MessageProtocolHandshakeTypeVersion
                {
                    major = 1,
                    minor = 0
                };
                handshakeMessage.messageProtocolHandshake.formats.format = [SHIPMessageFormat.JSON_UTF8];
                await SendMessage(SHIPMessageType.CONTROL, handshakeMessage);

				//{"messageProtocolHandshake":[{"handshakeType":"announceMax"},{"version":[{"major":1},{"minor: 0}]},{"formats":[{"format":["JSON-UTF8"]}]}]}
				//{"messageProtocolHandshake":[{"handshakeType":"announceMax"},{"version":[{"major":1},{"minor":0}]},{"formats":[{"format":["JSON-UTF8"]}]}]}
				//{"messageProtocolHandshake":[{"handshakeType":"announceMax"},{"version":[{"major":1},{"minor":0}]},{"formats":[{"format":["JSON-UTF8"]}]}]}
				/*var msg = new
                {
                    messageProtocolHandshake = new object[] {
                        new { handshakeType = "announceMax" },
                        new { version = new object[] { new { major = 1 }, new { minor = 0 } } },
                        new { formats = new object[] { new { format = new[] { "JSON-UTF8" } } } }
                        }
                };

                await SendMessage(SHIPMessageType.CONTROL, msg);*/


				var handshakeMessageReceived = await ReceiveMessage<SHIPHandshakeMessage>(SHIPMessageType.CONTROL);

               /* if (handshakeMessageReceived.messageProtocolHandshake.handshakeType != ProtocolHandshakeTypeType.select)
                {
                    throw new Exception("Protocol version selection expected!");
                }

                if (handshakeMessageReceived.messageProtocolHandshake.version.major != 1 && handshakeMessageReceived.messageProtocolHandshake.version.minor != 0)
                {
                    throw new Exception("Protocol version mismatch!");
                }*/

                return true;
                /*if ((handshakeMessageReceived.messageProtocolHandshake.formats.format.Length > 0) && (handshakeMessageReceived.messageProtocolHandshake.formats.format[0] == SHIPMessageFormat.JSON_UTF8))
                {
                    // send the message back
                    byte[] handshakeReturn = new byte[result.Count];
                    Buffer.BlockCopy(handshakeResponse, 0, handshakeReturn, 0, result.Count);
                    await _wsClient.SendAsync(handshakeReturn, WebSocketMessageType.Binary, true, new CancellationTokenSource(SHIPMessageTimeout.CMI_TIMEOUT).Token).ConfigureAwait(false);

                    return true;
                }
                else
                {
                    throw new Exception("Protocol format mismatch!");
                }*/
            }
            catch (Exception ex)
            {
                /*try
                {
                    // send handshake error message
                    SHIPHandshakeErrorMessage handshakeErrorMessage = new SHIPHandshakeErrorMessage();

                    if (ex.Message.Contains("mismatch"))
                    {
                        handshakeErrorMessage.messageProtocolHandshakeError.error = SHIPHandshakeError.SELECTION_MISMATCH;
                    }
                    else
                    {
                        handshakeErrorMessage.messageProtocolHandshakeError.error = SHIPHandshakeError.UNEXPECTED_MESSAGE;
                    }

                    await SendMessage(SHIPMessageType.CONTROL, handshakeErrorMessage);
                }
                catch (Exception innerEx)
                {
                    Console.WriteLine("Exception: " + innerEx.Message);
                }*/

                throw;
            }
        }
    }
}
