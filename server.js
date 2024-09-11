const express = require('express');
const mqtt = require('mqtt');
const escpos = require('escpos');
const USB = require('escpos-usb');
const Network = require('escpos-network');
const SerialPort = require('serialport');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// MQTT Client Setup
const mqttHost = process.env.MQTT_HOST;
const mqttPort = process.env.MQTT_PORT;
const mqttUsername = process.env.MQTT_USERNAME;
const mqttPassword = process.env.MQTT_PASSWORD;
const mqttTopic = process.env.MQTT_TOPIC;

if (!mqttHost) {
    throw new Error('MQTT_HOST is not set in the environment variables');
}

const client = mqtt.connect(mqttHost, {
    port: mqttPort,
    username: mqttUsername,
    password: mqttPassword,
});

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    client.subscribe(mqttTopic, (err) => {
        if (err) {
            console.error('Failed to subscribe to topic:', mqttTopic, err);
        } else {
            console.log('Subscribed to topic:', mqttTopic);
        }
    });
});

client.on('message', (topic, message) => {
    console.log('Message received on topic:', topic);
    const printData = JSON.parse(message.toString());
    printDataToPrinter(printData);
});

function printDataToPrinter(data) {
    const { printerType, printerIp, printerCOMPortName, printerBaudrate } = data.settings;

    let device;
    switch (printerType) {
        case 'USB':
            device = new USB();
            break;
        case 'Network':
            device = new Network(printerIp);
            break;
        case 'Serial':
            device = new escpos.SerialPort(printerCOMPortName, { baudRate: printerBaudrate });
            break;
        default:
            console.error('Unsupported printer type:', printerType);
            return;
    }

    const printer = new escpos.Printer(device);

    device.open(function (err) {
        if (err) {
            console.error('Failed to open printer:', err);
            return;
        }

        // Print layout example (use actual HTML/CSS or template rendering here)
        printer
            .text(data.header.hotelName)
            .text(data.header.address)
            .text('Thank you for your Order!')
            .cut()
            .close();
    });
}

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
