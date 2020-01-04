const http = require('http').createServer(handler);
const fs = require('fs');
const io = require('socket.io')(http);
const pigpio = require('pigpio');
const Gpio = pigpio.Gpio;

let LED_R = new Gpio(4, {mode: Gpio.OUTPUT});
let LED_G = new Gpio(17, {mode: Gpio.OUTPUT});
let LED_B = new Gpio(27, {mode: Gpio.OUTPUT});
let RGB_R = 1;
let RGB_G = 1;
let RGB_B = 1;

LED_R.digitalWrite(RGB_R);
LED_G.digitalWrite(RGB_G);
LED_B.digitalWrite(RGB_B);
pigpio.initialize()

const cleanup = () => {
    LED_R.digitalWrite(1);
    LED_G.digitalWrite(1);
    LED_B.digitalWrite(1);
    pigpio.terminate();
    process.exit();
};

process.on('SIGINT', cleanup)

function handler (req, res) {
    let filePath = req.url.split('.');
    let extension = filePath[filePath.length - 1];
    let fileType = 'text/html';
    let file = req.url === '/' ? '/index.html' : req.url;

    switch (extension) {
        case 'js':
            fileType = 'application/javascript; charset=utf-8';
            break;
        case 'css':
            fileType = 'text/css';
            break;
        case 'ico':
            fileType = 'image/vnd.microsoft.icon';
            break;
        case 'html':
            fileType = 'text/html';
            break;
    }
    // console.log(`url: ${req.url}, file: ${file}, fileType: ${fileType}, file path: ${__dirname}/public${file}`);
    fs.readFile(`${__dirname}/public/${file}` , function(err, data) {
        // read file index.html in public folder
        if (err) {
            // display 404 on error
            res.writeHead(404, {'Content-Type': 'text/html'});
            return res.end("404 Not Found");
        }

        // write HTML
        res.writeHead(200, {'Content-Type': fileType});

        // write data from index.html
        res.write(data);
        return res.end();
    });
}

// WebSocket Connection
io.sockets.on('connection', function (socket) {
    socket.on('rgbLed', (data) => {
        RGB_R = 255 - parseInt(data.red);
        RGB_G = 255 - parseInt(data.green);
        RGB_B = 255 - parseInt(data.blue);

        LED_R.pwmWrite(RGB_R);
        LED_G.pwmWrite(RGB_G);
        LED_B.pwmWrite(RGB_B);
    });
});



http.listen(8080)
