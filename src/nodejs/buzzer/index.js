const pigpio = require('pigpio')
const Gpio = pigpio.Gpio

pigpio.initialize()

const cleanup = () => {
    buzzer.digitalWrite(1)
    pigpio.terminate()
    process.exit()
}

process.on('SIGINT', cleanup)

const sleep = ms => {
    let start = new Date().valueOf()
    let expire = start + ms
    while (new Date().valueOf() < expire) {}
    return
}

const main = () => {
    clearInterval(MAIN_INTERVAL)
    buzzer.digitalWrite(0)
    sleep(100)
    buzzer.digitalWrite(1)
    sleep(100)
    MAIN_INTERVAL = setInterval(main, 1)
}

const BUZZER_PIN = 17

let buzzer = new Gpio(BUZZER_PIN, {mode: Gpio.OUTPUT})
buzzer.digitalWrite(1)

let MAIN_INTERVAL = setInterval(main, 1)
