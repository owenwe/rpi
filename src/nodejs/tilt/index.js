const pigpio = require('pigpio')
const Gpio = pigpio.Gpio

pigpio.initialize()

const cleanup = () => {
    led.digitalWrite(1)
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
    // clearInterval(MAIN_INTERVAL)
    sleep(100)
    // MAIN_INTERVAL = setInterval(main, 1)
}

const TILT_PIN = 17
const LED_PIN = 18

let ledStatus = 1
let tilt = new Gpio(TILT_PIN, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    alert: true
})
let led = new Gpio(LED_PIN, {mode: Gpio.OUTPUT})
led.digitalWrite(1)

tilt.enableAlert()
tilt.enableInterrupt(Gpio.FALLING_EDGE)
tilt.on('alert', (level, tick) => {
    console.log(`level: ${level}, tick: ${tick}`)
})

// let MAIN_INTERVAL = setInterval(main, 1)
