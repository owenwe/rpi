const pigpio = require('pigpio')
const Gpio = pigpio.Gpio

let LED
let INTERVAL

pigpio.initialize()

const cleanup = () => {
  LED.digitalWrite(0)
  pigpio.terminate()
  clearInterval(INTERVAL)
}

process.on('SIGINT', cleanup)

LED = new Gpio(17, {mode: Gpio.OUTPUT})

const main = () => {
  console.log(`writing to GPIO Pin 17: ${LED.digitalRead() ^ 1}`)
  LED.digitalWrite(LED.digitalRead() ^ 1)
}

console.log('Hardware Revision: ' + pigpio.hardwareRevision().toString(16))

INTERVAL = setInterval(main, 1000)