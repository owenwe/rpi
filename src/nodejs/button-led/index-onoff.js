const Gpio = require('onoff').Gpio

let led = new Gpio(17, 'out')
let button = new Gpio(4, 'in', 'both')

button.watch((err, value) => {
  if (err) {
    console.error('ERROR', err)
    return
  }
  led.writeSync(value)
})

const unexportOnClose = () => {
  led.writeSync(1)
  led.unexport()
  button.unexport()
  process.exit()
}

process.on('SIGINT', unexportOnClose)
