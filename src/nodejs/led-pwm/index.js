const pigpio = require('pigpio')
const Gpio = pigpio.Gpio

pigpio.initialize()

const cleanup = () => {
    P.digitalWrite(0)
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
    for (dc = 0; dc < 101; dc += 4) {
        P.pwmWrite(dc)
        sleep(50)
    }

    sleep(1000)

    for (dc = 100; dc > -1; dc -= 4) {
        P.pwmWrite(dc)
        sleep(50)
    }

    MAIN_INTERVAL = setInterval(main, 1000)
}

const LED_PIN = 18

let P = new Gpio(LED_PIN, {mode: Gpio.OUTPUT})
P.pwmWrite(0)

let MAIN_INTERVAL = setInterval(main, 10)

