const pigpio = require('pigpio')
const Gpio = pigpio.Gpio

pigpio.initialize()

const cleanup = () => {
    led.digitalWrite(0)
    pigpio.terminate()
    process.exit()
}

process.on('SIGINT', cleanup)

const BUTTON_PIN = 4
const LED_PIN = 17

let led = new Gpio(LED_PIN, {mode: Gpio.OUTPUT})
let button = new Gpio(BUTTON_PIN, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    // edge: Gpio.EITHER_EDGE,
    alert: true
})

button.glitchFilter(10000)

// initialize LED to off
led.digitalWrite(0)

button.on('interrupt', (level) => {
    let ledValue = led.digitalRead()
    console.log(`button interrupt >> level: ${level}, LED Value: ${ledValue}`)
    led.digitalWrite(1 >> ledValue)
})

button.on('alert', (level, tick) => {
    let ledValue = led.digitalRead()
    console.log(`button alert >> level: ${level}, tick: ${tick}, LED Value: ${ledValue}`)
    led.digitalWrite(1 >> ledValue)
})

console.log('program ready')
