const http = require('http').createServer(handler);
const fs = require('fs');
const io = require('socket.io')(http);
const pigpio = require('pigpio');
const Gpio = pigpio.Gpio;

const cleanup = () => {
    pigpio.terminate();
    process.exit();
};

process.on('SIGINT', cleanup);

const MOTOR = new Gpio(10, {mode: Gpio.OUTPUT});

function handler (req, res) {
    let filePath = req.url.split('.');
    let extension = filePath[filePath.length - 1];
    let fileType = 'text/html';
    let file = req.url;

    switch (file) {
        case '/':
            file = `${__dirname}/public/index.html`;
            break;
        case '/favicon.ico':
            file = `${__dirname}/public/favicon.ico`;
            break;
        default:
            file = `${__dirname}/public/${file}`;
    }

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
    fs.readFile(file , function(err, data) {
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
    socket.on('servoSlider', (data) => {
        // pulse width: 1000, increment: 100
        console.log(data);
        if ((data < 2501) && (data > 499)) {
            MOTOR.servoWrite(data);
        }
    });
});

MOTOR.servoWrite(500);

http.listen(8080);
