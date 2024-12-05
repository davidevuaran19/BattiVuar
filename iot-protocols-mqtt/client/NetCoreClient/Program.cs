using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using RabbitMQ.Client;
using NetCoreClient.Sensors;

class Program
{
    static async Task Main(string[] args)
    {
        // Definisci i sensori
        List<ISensorInterface> sensors = new();
        sensors.Add(new VirtualWaterTempSensor());
        sensors.Add(new VirtualLightSensor());

        // Configurazione RabbitMQ
        var factory = new ConnectionFactory()
        {
            Uri = new Uri("amqps://evedcoyy:fBIUPWAefQ-D6XHElTwpidsqH5UtclGW@cow.rmq2.cloudamqp.com/evedcoyy")
        };

        using (var connection = factory.CreateConnection())
        using (var channel = connection.CreateModel())
        {
            string queueName = "iotcasette";
            channel.QueueDeclare(queue: queueName, durable: true, exclusive: false, autoDelete: false, arguments: null);

            // Invia i dati al server
            while (true)
            {
                foreach (ISensorInterface sensor in sensors)
                {
                    var sensorValue = sensor.ToJson();
                    var body = Encoding.UTF8.GetBytes(sensorValue);

                    // Pubblica il messaggio nella coda RabbitMQ
                    channel.BasicPublish(exchange: "", routingKey: queueName, basicProperties: null, body: body);

                    Console.WriteLine("Dati inviati a RabbitMQ: " + sensorValue);

                    // Aspetta 5 secondi prima di inviare il prossimo set di dati
                    Thread.Sleep(5000);
                }
            }
        }
    }
}