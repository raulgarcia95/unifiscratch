// Unifiscratch micro:shield firmware (MIT).
// Drives the Make&Learn micro:shield (PCA9685 at I2C 0x40) and the micro:bit
// pins. PCA9685 channel map, servo pulse formula and stepper phase values come
// from MakeAndLearn/pxt-microshield (MIT, Copyright (c) 2019 MakeAndLearn).
//
// Line protocol, identical over Bluetooth UART and USB serial (115200):
//   ?                  -> replies "MS1"
//   K                  keepalive (host sends every 500 ms)
//   M n v t            DC motor n (1..4, 0 = all), speed v -100..100,
//                      t ms (0 = until next order, max. 5000)
//   P n d t            stepper n (1|2), d 1 forward / -1 backward, t ms (max. 30000)
//   S                  stop every motor and stepper
//   V n a              servo n (0..7) to angle a (0..180)
//   F n                servo n off (no pulse)
//   W p v              digital write pin p (0|1)
//   A p v              analog (PWM) write pin p (0..1023)
//   G p m              watch pin p: 0 off, 1 digital, 2 analog
//   U t e              sonar trigger / echo pins (99 = off)
//   L p n i r g b      LED strip on pin p with n LEDs (0 = keep); LED i (0 = all)
//   I bits             LED matrix, 25-bit number (bit 0 = top-left)
//   T text             scroll text
//   C                  clear matrix
//   B freq ms          tone
// Every 100 ms while the host talks: "D cm a b" and, for watched pins,
// "E pin:value pin:value ...".
// Safety: motors and steppers stop if nothing arrives for 1.5 s,
// if Bluetooth drops or when a timed order ends.

const PCA9685 = 0x40
const OFF = 99
const STRIP_MAX = 64
// Phase-shifted PWM (on, off) that makes 4 coils step in sequence.
const PHASE = [2047, 4095, 1, 2047, 1023, 3071, 3071, 1023]

let pcaReady = false
let lastRx = 0
let motorsOn = false
// Per-output deadlines in ms (0 = no deadline): motors 1..4, steppers 1..2.
const motorStop = [0, 0, 0, 0]
const stepStop = [0, 0]
let bleConnected = false
let trigPin = OFF
let echoPin = OFF
let stripPin = OFF
let stripCount = 0
let strip = pins.createBuffer(STRIP_MAX * 3)
const watchPin: number[] = []
const watchMode: number[] = []

function reg(r: number, v: number) {
    const buf = pins.createBuffer(2)
    buf[0] = r; buf[1] = v
    pins.i2cWriteBuffer(PCA9685, buf)
}

function pwm(channel: number, on: number, off: number) {
    if (channel < 0 || channel > 15) return
    const buf = pins.createBuffer(5)
    buf[0] = 0x06 + 4 * channel
    buf[1] = on & 0xff
    buf[2] = (on >> 8) & 0xff
    buf[3] = off & 0xff
    buf[4] = (off >> 8) & 0xff
    pins.i2cWriteBuffer(PCA9685, buf)
}

function initPca() {
    reg(0x00, 0x00)
    // 50 Hz: 25 MHz / 4096 / 50, corrected like the original library.
    const prescale = Math.floor(25000000 / 4096 / 50 * 25 / 24 - 1)
    pins.i2cWriteNumber(PCA9685, 0x00, NumberFormat.UInt8BE)
    const oldmode = pins.i2cReadNumber(PCA9685, NumberFormat.UInt8BE)
    reg(0x00, (oldmode & 0x7f) | 0x10)
    reg(0xfe, prescale)
    reg(0x00, oldmode)
    basic.pause(1)
    reg(0x00, oldmode | 0xa1)
    for (let i = 0; i < 16; i++) pwm(i, 0, 0)
    pcaReady = true
}

function ensurePca() {
    if (!pcaReady) initPca()
}

function stopAll() {
    ensurePca()
    for (let i = 0; i < 8; i++) pwm(i, 0, 0)
    motorsOn = false
    for (let i = 0; i < 4; i++) motorStop[i] = 0
    stepStop[0] = 0
    stepStop[1] = 0
}

function releaseStepper(n: number) {
    const base = n == 2 ? 4 : 0
    for (let i = 0; i < 4; i++) pwm(base + i, 0, 0)
    stepStop[n - 1] = 0
}

function motor(n: number, speed: number) {
    ensurePca()
    const duty = Math.constrain(Math.round(speed * 4095 / 100), -4095, 4095)
    const p = (n - 1) * 2
    if (duty >= 0) {
        pwm(p, 0, duty)
        pwm(p + 1, 0, 0)
    } else {
        pwm(p, 0, 0)
        pwm(p + 1, 0, -duty)
    }
}

function stepper(n: number, forward: boolean) {
    ensurePca()
    const base = n == 2 ? 4 : 0
    const order = forward ? [0, 3, 1, 2] : [2, 1, 3, 0]
    for (let k = 0; k < 4; k++) pwm(base + order[k], PHASE[k * 2], PHASE[k * 2 + 1])
}

function servo(n: number, degree: number) {
    ensurePca()
    const us = degree * 1800 / 180 + 600 // 0.6 .. 2.4 ms
    pwm(n + 8, 0, Math.round(us * 4096 / 20000))
}

function byte(v: number) {
    return Math.constrain(Math.round(v || 0), 0, 255)
}

// Only pins the shield leaves free: not the display, buttons or I2C.
const FREE_PINS = [0, 1, 2, 8, 12, 13, 14, 15, 16]
const DIGITAL = [DigitalPin.P0, DigitalPin.P1, DigitalPin.P2, DigitalPin.P8, DigitalPin.P12,
    DigitalPin.P13, DigitalPin.P14, DigitalPin.P15, DigitalPin.P16]
const ANALOG = [AnalogPin.P0, AnalogPin.P1, AnalogPin.P2, AnalogPin.P8, AnalogPin.P12,
    AnalogPin.P13, AnalogPin.P14, AnalogPin.P15, AnalogPin.P16]

function freePin(p: number): boolean {
    return FREE_PINS.indexOf(p) >= 0
}

function pinOf(p: number): DigitalPin {
    return DIGITAL[FREE_PINS.indexOf(p)]
}

function analogPinOf(p: number): AnalogPin {
    return ANALOG[FREE_PINS.indexOf(p)]
}

function unwatch(p: number) {
    const i = watchPin.indexOf(p)
    if (i >= 0) {
        watchPin.removeAt(i)
        watchMode.removeAt(i)
    }
}

function watch(p: number, mode: number) {
    unwatch(p)
    if (mode == 2 && p > 2) mode = 1 // analog input only on P0, P1, P2
    if (mode > 0 && freePin(p)) {
        watchPin.push(p)
        watchMode.push(mode)
    }
}

function send(text: string) {
    serial.writeString(text + "\n")
    if (bleConnected) bluetooth.uartWriteString(text + "\n")
}

function showBits(bits: number) {
    for (let i = 0; i < 25; i++) {
        if ((bits >> i) & 1) led.plot(i % 5, Math.idiv(i, 5))
        else led.unplot(i % 5, Math.idiv(i, 5))
    }
}

function setStrip(p: number, n: number, index: number, r: number, g: number, b: number) {
    if (!freePin(p)) return
    if (p != stripPin) {
        strip.fill(0)
        stripPin = p
        stripCount = 0
        unwatch(p)
    }
    if (n > 0) stripCount = Math.min(n, STRIP_MAX)
    if (index > stripCount) stripCount = Math.min(index, STRIP_MAX)
    if (stripCount == 0) return
    // WS2812 order is GRB
    for (let i = 0; i < stripCount; i++) {
        if (index == 0 || index == i + 1) {
            strip[i * 3] = g
            strip[i * 3 + 1] = r
            strip[i * 3 + 2] = b
        }
    }
    ws2812b.sendBuffer(strip.slice(0, stripCount * 3), pinOf(p))
}

// Drop CR, spaces and control characters at both ends.
function clean(text: string): string {
    let start = 0
    let end = text.length
    while (start < end && text.charCodeAt(start) <= 32) start++
    while (end > start && text.charCodeAt(end - 1) <= 32) end--
    return text.substr(start, end - start)
}

function handle(line: string) {
    line = clean(line)
    if (line.length == 0) return
    lastRx = control.millis()
    const cmd = line.charAt(0)
    const rest = clean(line.substr(1))
    const n = rest.split(" ").map(s => parseInt(s))
    if (cmd == "?") send("MS1")
    else if (cmd == "K") { }
    else if (cmd == "M") {
        const which = n[0] || 0
        if (which < 0 || which > 4) return
        const speed = Math.constrain(n[1] || 0, -100, 100)
        const t = n[2] || 0
        const deadline = t > 0 ? control.millis() + Math.min(t, 5000) : 0
        for (let m = 1; m <= 4; m++) {
            if (which == 0 || which == m) {
                motor(m, speed)
                motorStop[m - 1] = speed != 0 ? deadline : 0
            }
        }
        if (speed != 0) motorsOn = true
    }
    else if (cmd == "P") {
        const t = Math.min(n[2] || 0, 30000)
        if (t <= 0) return
        const which = n[0] == 2 ? 2 : 1
        stepper(which, n[1] >= 0)
        motorsOn = true
        stepStop[which - 1] = control.millis() + t
    }
    else if (cmd == "S") stopAll()
    else if (cmd == "V") {
        if (n[0] >= 0 && n[0] <= 7) servo(n[0], Math.constrain(n[1] || 0, 0, 180))
    }
    else if (cmd == "F") {
        if (n[0] >= 0 && n[0] <= 7) {
            ensurePca()
            pwm(n[0] + 8, 0, 0)
        }
    }
    else if (cmd == "W") {
        if (!freePin(n[0])) return
        unwatch(n[0])
        pins.digitalWritePin(pinOf(n[0]), n[1] ? 1 : 0)
    }
    else if (cmd == "A") {
        if (!freePin(n[0])) return
        unwatch(n[0])
        pins.analogWritePin(analogPinOf(n[0]), Math.constrain(n[1] || 0, 0, 1023))
    }
    else if (cmd == "G") watch(n[0], n[1] || 0)
    else if (cmd == "U") {
        trigPin = freePin(n[0]) ? n[0] : OFF
        echoPin = freePin(n[1]) ? n[1] : OFF
        unwatch(trigPin)
        unwatch(echoPin)
    }
    else if (cmd == "L") setStrip(n[0], n[1] || 0, n[2] || 0, byte(n[3]), byte(n[4]), byte(n[5]))
    else if (cmd == "I") showBits(n[0] || 0)
    else if (cmd == "T") control.inBackground(() => basic.showString(rest, 80))
    else if (cmd == "C") basic.clearScreen()
    else if (cmd == "B") {
        const f = n[0] || 440
        const ms = Math.constrain(n[1] || 200, 0, 3000)
        control.inBackground(() => music.playTone(f, ms))
    }
}

function distanceCm(): number {
    if (trigPin == OFF || echoPin == OFF) return 0
    const trig = pinOf(trigPin)
    const echo = pinOf(echoPin)
    pins.setPull(trig, PinPullMode.PullNone)
    pins.digitalWritePin(trig, 0)
    control.waitMicros(2)
    pins.digitalWritePin(trig, 1)
    control.waitMicros(10)
    pins.digitalWritePin(trig, 0)
    const us = pins.pulseIn(echo, PulseValue.High, 25000)
    return us > 0 ? Math.idiv(us, 58) : 0
}

function pinReport(): string {
    let text = ""
    for (let i = 0; i < watchPin.length; i++) {
        const p = watchPin[i]
        const value = watchMode[i] == 2 ?
            pins.analogReadPin(analogPinOf(p)) : pins.digitalReadPin(pinOf(p))
        text += " " + p + ":" + value
    }
    return text
}

bluetooth.startUartService()
bluetooth.onBluetoothConnected(() => {
    bleConnected = true
    basic.showIcon(IconNames.Yes, 0)
})
bluetooth.onBluetoothDisconnected(() => {
    bleConnected = false
    stopAll()
    basic.showIcon(IconNames.No, 0)
})
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), () => {
    handle(bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)))
})
serial.setBaudRate(BaudRate.BaudRate115200)
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), () => {
    handle(serial.readUntil(serial.delimiters(Delimiters.NewLine)))
})

stopAll()
basic.showString("S")

basic.forever(() => {
    const now = control.millis()
    for (let m = 1; m <= 4; m++) {
        if (motorStop[m - 1] > 0 && now >= motorStop[m - 1]) {
            motor(m, 0)
            motorStop[m - 1] = 0
        }
    }
    for (let k = 1; k <= 2; k++) {
        if (stepStop[k - 1] > 0 && now >= stepStop[k - 1]) releaseStepper(k)
    }
    if (motorsOn && now - lastRx > 1500) stopAll()
    if (now - lastRx < 3000) {
        send("D " + distanceCm() + " " +
            (input.buttonIsPressed(Button.A) ? 1 : 0) + " " + (input.buttonIsPressed(Button.B) ? 1 : 0))
        if (watchPin.length > 0) send("E" + pinReport())
    }
    basic.pause(100)
})
