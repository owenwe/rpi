const pigpio = require('pigpio');
const Gpio = pigpio.Gpio;

const cleanup = () => {
    clearInterval(mainInterval);
    pigpio.terminate();
    process.exit();
};

process.on('SIGINT', cleanup);

const motor = new Gpio(10, {mode: Gpio.OUTPUT});

let pulseWidth = 1000;
let increment = 100;
let mainInterval = setInterval(() => {
    motor.servoWrite(pulseWidth);

    pulseWidth += increment;
    if (pulseWidth >= 2000) {
        increment = -100;
    } else if (pulseWidth <= 1000) {
        increment = 100;
    }
}, 1000);
