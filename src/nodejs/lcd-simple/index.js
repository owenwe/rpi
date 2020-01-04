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
const message = async text => {
    // console.log(`writing message to LCD: ${text}`)
    for (char in text) {
        let isNewline = text[char] === '\n'
        if (isNewline) {
            await write4bits(LCD_NEWLINE)
        } else {
            // console.log(`sending bits to write4bits() ${text[char].charCodeAt(0)}`)
            await write4bits( text[char].charCodeAt(0), true)
        }
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
    // console.log(`write4bits(${bits})`)
    let bit = Math.abs(Number(bits))
    if (bit < 256) {
        // await delayMicroseconds(2)
        let first4Bits = bit.toString(2).padStart(8, '0').slice(0, 4)
        let last4Bits = bit.toString(2).padStart(8, '0').slice(4)
        // console.log(`sending output to RS PIN (char_mode): ${char_mode}`)
        // console.log(`bits now: ${first4Bits}${last4Bits}`)
        REG_SELECT_PIN.digitalWrite(char_mode === true ? 1 : 0)

        GPIO_PINS.forEach(pin => {
            pin.digitalWrite(0)
        })

        // check the first 4 binary values of the passed bits value
        // console.log(`outputting first 4 bits to pins (from last to first): ${first4Bits[0]}, ${first4Bits[1]}, ${first4Bits[2]}, ${first4Bits[3]}`)
        for (i = 0; i < 4; i++) {
            if (first4Bits[i] === '1') {
                GPIO_PINS[GPIO_PINS.length - (1 + i)].digitalWrite(1)
            }
        }

        await pulseEnable()

        GPIO_PINS.forEach(pin => {
            pin.digitalWrite(0)
        })

        // check the last 4 binary values of the passed bits value
        // console.log(`outputting last 4 bits to pins (from last to first): ${last4Bits[0]}, ${last4Bits[1]}, ${last4Bits[2]}, ${last4Bits[3]}`)
        for (i = 0; i < 4; i++) {
            if (last4Bits[i] === '1') {
                GPIO_PINS[GPIO_PINS.length - (1 + i)].digitalWrite(1)
            }
        }

        await pulseEnable()
    }
}

const clear = async () => {
    await write4bits(LCD_CLEARDISPLAY) // command to clear display
    await delayMicroseconds(3000) // clearing the screen takes a long time
}

const init = async () => {
    await write4bits(0x33) // initialization
    await write4bits(0x32) // initialization
    await write4bits(0x28) // 2 line 5x7 matrix
    await write4bits(0x0C) // turn cursor off, set to 0x0E to enable cursor
    await write4bits(0x06) // shift cursor right

    displayControl = LCD_DISPLAYON | LCD_CURSOROFF | LCD_BLINKOFF
    displayFunction = LCD_4BITMODE | LCD_1LINE | LCD_5x8DOTS
    displayFunction |= LCD_2LINE
    displayMode = LCD_ENTRYLEFT | LCD_ENTRYSHIFTDECREMENT

    await write4bits(LCD_ENTRYMODESET | displayMode) // set the entry mode
    await clear()

    MAIN_INTERVAL = setInterval(main, 100)
}

/**
 * Main program function
 */
const main = async () => {
    clearInterval(MAIN_INTERVAL)
    await clear()
    await message(lcdMessages[messageIndex++])
    await delayMicroseconds(2000)
    await clear()
    await message(lcdMessages[messageIndex++])
    await delayMicroseconds(2000)
    await clear()
    await message(lcdMessages[messageIndex])
    await delayMicroseconds(2000)
    messageIndex = 0
    MAIN_INTERVAL = setInterval(main, 100)
}

// initialize program
const REG_SELECT_PIN = new Gpio(PIN_RS, {mode: Gpio.OUT})
const STROBE_PIN = new Gpio(PIN_E, {mode: Gpio.OUT})
const GPIO_PINS = []

PINS_DB.forEach(pin => {
    GPIO_PINS.push(new Gpio(pin, {mode: Gpio.OUT}))
})

let displayControl
let displayFunction

// initialize to default text direction (for romance languages)
let displayMode

let numlines = 2
let currline = 0

let MAIN_INTERVAL
let messageIndex = 0
let lcdMessages = [
    ' LCD 1602 Test \n123456789ABCDEF',
    ' Hello, geeks !\nHello World ! :)',
    ' 8=====D-~<3 '
]

init()
