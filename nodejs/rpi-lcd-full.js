const pigpio = require('pigpio')
const Gpio = pigpio.Gpio

// commands
const LCD_CLEARDISPLAY = 0x01
const LCD_RETURNHOME = 0x02
const LCD_ENTRYMODESET = 0x04
const LCD_DISPLAYCONTROL = 0x08
const LCD_CURSORSHIFT = 0x10
const LCD_FUNCTIONSET = 0x20
const LCD_SETCGRAMADDR = 0x40
const LCD_SETDDRAMADDR = 0x80

// flags for display entry mode
const LCD_ENTRYRIGHT = 0x00
const LCD_ENTRYLEFT = 0x02
const LCD_ENTRYSHIFTINCREMENT = 0x01
const LCD_ENTRYSHIFTDECREMENT = 0x00

// flags for display on/off control
const LCD_DISPLAYON = 0x04
const LCD_DISPLAYOFF = 0x00
const LCD_CURSORON = 0x02
const LCD_CURSOROFF = 0x00
const LCD_BLINKON = 0x01
const LCD_BLINKOFF = 0x00

// flags for display/cursor shift
const LCD_DISPLAYMOVE = 0x08
const LCD_CURSORMOVE = 0x00
const LCD_MOVERIGHT = 0x04
const LCD_MOVELEFT = 0x00
const LCD_NEWLINE = 0xC0

// flags for function set
const LCD_8BITMODE = 0x10
const LCD_4BITMODE = 0x00
const LCD_2LINE = 0x08
const LCD_1LINE = 0x00
const LCD_5x10DOTS = 0x04
const LCD_5x8DOTS = 0x00

// Register Select Pin Number
const PIN_E = 23

// Strobe Pin Number
const PIN_RS = 24

// The LED GPIO Pin Numbers
const PINS_DB = [17, 18, 27, 22]

pigpio.initialize()

/**
 * Cleanup function when program closes
 */
const unexportOnClose = () => {
    console.warn('handling program exit signal')
    REG_SELECT_PIN.digitalWrite(1)
    STROBE_PIN.digitalWrite(1)
    GPIO_PINS.forEach(pin => {
        pin.digitalWrite(1)
    })
    pigpio.terminate()
    clearInterval(MAIN_INTERVAL)
    process.exit()
}

// cleanup on program exit
process.on('SIGINT', unexportOnClose)

/**
 * Sends string to LCD. Newline wraps to second line
 * @param {string} text
 * @returns {void}
 */
const message = text => {
  for (char in text) {
    let isNewline = text[char] === '\n'
    write4bits( isNewline ? LCD_NEWLINE : text[char].charCodeAt(0), !isNewline)
  }
}

/**
 * Sends off/on/off to the Strobe Pin
 * @returns {Promise<void>}
 */
const pulseEnable = async () => {
  STROBE_PIN.digitalWrite(0)
  await delayMicroseconds(1)
  STROBE_PIN.digitalWrite(1)
  await delayMicroseconds(1)
  STROBE_PIN.digitalWrite(0)
  await delayMicroseconds(1)
}

/**
 * Pauses execution of the program by the number of given milliseconds
 * @param {number} ms
 * @returns {Promise<unknown>}
 */
const delayMicroseconds = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Sends a command to the LCD device
 * @param {number} bits
 * @param {boolean} char_mode
 * @returns {Promise<void>}
 */
const write4bits = async (bits, char_mode = false) => {
  let bit = Math.abs(Number(bits))
  if (bit < 256) {
    await delayMicroseconds(1000)

    let bitBinary = bit.toString(2).padStart(8, '0').slice(0, 4)

    REG_SELECT_PIN.digitalWrite(char_mode === true ? 1 : 0)

    GPIO_PINS.forEach(pin => {
      pin.digitalWrite(0)
    })

    // check the first 4 binary values of the passed bits value
    for (i = 0; i < 4; i++) {
      if (bitBinary[i] === '1') {
        GPIO_PINS[GPIO_PINS.length - (1 + i)].digitalWrite(0)
      }
    }

    await pulseEnable()

    GPIO_PINS.forEach(pin => {
      pin.digitalWrite(0)
    })

    // check the last 4 binary values of the passed bits value
    for (i = 4; i < 8; i++) {
      if (bitBinary[i] === '1') {
        GPIO_PINS[GPIO_PINS.length - (i - 3)].digitalWrite(0)
      }
    }

    await pulseEnable()
  }
}

/**
 * This will 'left justify' text from the cursor
 * @returns {void}
 */
const noAutoscroll = () => {
  displayMode &= ~LCD_ENTRYSHIFTINCREMENT
  write4bits(LCD_ENTRYMODESET | displayMode)
}

/**
 * This will 'right justify' text from the cursor
 * @returns {void}
 */
const autoscroll = () => {
  displayMode |= LCD_ENTRYSHIFTINCREMENT
  write4bits(LCD_ENTRYMODESET | displayMode)
}

/**
 * Display text that flows right-to-left
 * @returns {void}
 */
const rightToLeft = () => {
  displayMode &= ~LCD_ENTRYLEFT
  write4bits(LCD_ENTRYMODESET | displayMode)
}

/**
 * Display text that flows left-to-right
 * @returns {void}
 */
const leftToRight = () => {
  displayMode |= LCD_ENTRYLEFT
  write4bits(LCD_ENTRYMODESET | displayMode)
}

/**
 * Scroll the display to the right without changing RAM
 * @returns {void}
 */
const scrollDisplayRight = () => {
  write4bits(LCD_CURSORSHIFT | LCD_DISPLAYMOVE | LCD_MOVERIGHT)
}

/**
 * Scroll the display to the left without changing the RAM
 * @returns {void}
 */
const scrollDisplayLeft = () => {
  write4bits(LCD_CURSORSHIFT | LCD_DISPLAYMOVE | LCD_MOVELEFT)
}

/**
 * Turn on/off the blinking cursor
 * @returns {void}
 */
const noBlink = () => {
  displayControl &= ~LCD_BLINKON
  write4bits(LCD_DISPLAYCONTROL | displayControl)
}

/**
 * Turns the underline cursor on
 * @returns {void}
 */
const cursor = () => {
  displayControl |= LCD_CURSORON
  write4bits(LCD_DISPLAYCONTROL | displayControl)
}

/**
 * Turns the underline cursor off
 * @returns {void}
 */
const noCursor = () => {
  displayControl &= ~LCD_CURSORON
  write4bits(LCD_DISPLAYCONTROL | displayControl)
}

/**
 * Turns the display on (quickly)
 * @returns {void}
 */
const display = () => {
  displayControl |= LCD_DISPLAYON
  write4bits(LCD_DISPLAYCONTROL | displayControl)
}

/**
 * Turns the display off (quickly)
 * @returns {void}
 */
const noDisplay = () => {
  displayControl &= ~LCD_DISPLAYON
  write4bits(LCD_DISPLAYCONTROL | displayControl)
}

const setCursor = (col, row) => {
  let rowOffsets = [0x00, 0x40, 0x14, 0x54]

  if (row > numlines) {
    // we count rows starting with 0
    row = numlines - 1
  }

  write4bits(LCD_SETDDRAMADDR | (col + rowOffsets[row]))
}

const clear = () => {
  write4bits(LCD_CLEARDISPLAY) // command to clear display
  delayMicroseconds(3000) // clearing the screen takes a long time
}

const home = () => {
  write4bits(LCD_RETURNHOME)
  delayMicroseconds(3000)
}

const begin = (cols, lines) => {
  if (lines > 1) {
    numlines = lines
    displayFunction |= LCD_2LINE
    currline = 0
  }
}

/**
 * Main program function
 */
const main = async () => {
    console.log(`outputting message: [${lcdMessages[messageIndex]}]`)
    clear()
    message(lcdMessages[messageIndex])
    if (messageIndex === 2) {
        messageIndex = 0
    } else {
        messageIndex++
    }
}

// initialize program
const REG_SELECT_PIN = new Gpio(PIN_RS, {mode: Gpio.OUTPUT})
const STROBE_PIN = new Gpio(PIN_E, {mode: Gpio.OUTPUT})
const GPIO_PINS = []

PINS_DB.forEach(pin => {
  GPIO_PINS.push(new Gpio(pin, {mode: Gpio.OUTPUT}))
})

write4bits(0x33) // initialization
write4bits(0x32) // initialization
write4bits(0x28) // 2 line 5x7 matrix
write4bits(0x0C) // turn cursor off, set to 0x0E to enable cursor
write4bits(0x06) // shift cursor right

let displayControl = LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF
let displayFunction = LCD_4BITMODE | LCD_1LINE | LCD_5x8DOTS
displayFunction |= LCD_2LINE

// initialize to default text direction (for romance languages)
let displayMode = LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT

let numlines = 2
let currline = 0

let MAIN_INTERVAL
let messageIndex = 0
let lcdMessages = [
    ' LCD 1602 Test \n123456789ABCDEF',
    '   Hello, geeks !\nHello World ! :)',
    ' 8=====D-~<3 '
]

write4bits(LCD_ENTRYMODESET | displayMode) // set the entry mode
clear()

MAIN_INTERVAL = setInterval(main, 2000)