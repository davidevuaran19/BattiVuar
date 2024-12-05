const restify = require('restify');
const amqp = require('amqplib');
const mysql = require('mysql2');

// Crea il server RESTful
var server = restify.createServer();
server.use(restify.plugins.bodyParser());

// Configurazione della connessione al database MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Vmware1!',
    database: 'water_system_db'
});

// Connessione al database MySQL
db.connect(function(err) {
    if (err) {
        console.error('Errore di connessione al database: ' + err.stack);
        return;
    }
    console.log('Connesso al database come id ' + db.threadId);
});

// Configurazione AMQP
const amqpUrl = 'amqps://evedcoyy:fBIUPWAefQ-D6XHElTwpidsqH5UtclGW@cow.rmq2.cloudamqp.com/evedcoyy'; // Modifica l'URL in base al tuo broker
let channel;

async function setupAMQP() {
    try {
        const connection = await amqp.connect(amqpUrl);
        channel = await connection.createChannel();
        const queue = 'iotcasette';

        // Assicura che la coda esista
        await channel.assertQueue(queue, { durable: true });
        console.log('Connesso al broker AMQP e coda configurata:', queue);

        // Ascolta i messaggi dalla coda
        channel.consume(queue, (message) => {
            if (message !== null) {
                const payload = JSON.parse(message.content.toString());
                console.log(`Messaggio ricevuto su coda ${queue}:`, payload);

                // Inserimento della temperatura nell'array water_coolers
                if (payload.watertemp !== undefined) {
                    const watertemp = payload.watertemp;
                    const query = 'INSERT INTO water_coolers (watertemp) VALUES (?)';
                    db.execute(query, [watertemp], function (err, results) {
                        if (err) {
                            console.error('Errore durante l\'inserimento nel database:', err);
                        } else {
                            console.log('Temperatura inserita nel DB:', results);
                        }
                    });
                }

                // Inserimento dello stato della luce nell'array light_states
                if (payload.lightstate !== undefined) {
                    const lightstate = payload.lightstate;
                    const query = 'INSERT INTO light_states (lightstate) VALUES (?)';
                    db.execute(query, [lightstate], function (err, results) {
                        if (err) {
                            console.error('Errore durante l\'inserimento nel database:', err);
                        } else {
                            console.log('Stato luce inserito nel DB:', results);
                        }
                    });
                }

                // Conferma il messaggio al broker
                channel.ack(message);
            }
        });
    } catch (error) {
        console.error('Errore durante la configurazione di AMQP:', error);
    }
}

setupAMQP();

// Endpoint per ricevere comandi tramite REST API
server.post('/water_coolers_db/:id', function (req, res, next) {
    console.log('Dati ricevuti dalla casetta:', req.body);

    if (req.body.watertemp) {
        const watertemp = req.body.watertemp;
        const query = 'INSERT INTO water_coolers (watertemp) VALUES (?)';
        db.execute(query, [watertemp], function (err, results) {
            if (err) {
                console.error('Errore durante l\'inserimento nel database:', err);
                res.send(500, 'Errore durante l\'inserimento dei dati');
            } else {
                console.log('Temperatura ricevuta dalla REST API inserita nel DB:', results);
                res.send('Comando ricevuto e processato');
            }
        });
    } else {
        res.send(400, 'Temperatura non fornita');
    }

    return next();
});

// Altri endpoint RESTful
server.get('/water_coolers_db', function (req, res, next) {
    res.send('Lista delle casette [TODO]');
    return next();
});

server.get('/water_coolers_db/:id', function (req, res, next) {
    res.send('Stato della casetta ' + req.params['id'] + ': [TODO]');
    return next();
});

// Avvia il server RESTful
server.listen(8011, function () {
    console.log('%s listening at %s', server.name, server.url);
});
