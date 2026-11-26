// Unifiscratch Cutebot firmware (MIT). Own implementation.
// Line protocol, identical over Bluetooth UART and USB serial (115200):
//   ?                 -> replies "CB1"
//   K                 keepalive (host sends every 500 ms)
//   M l r t           motors l,r in -100..100; t ms (0 = until next order)
//   S                 stop motors
//   H side r g b      headlight: 0 left, 1 right, 2 both
//   N r g b           underglow (2 LEDs on P15)
//   V n a             servo n (1|2) to angle a (0..180)
//   I bits            LED matrix, 25-bit number (bit 0 = top-left)
//   T text            scroll text
//   C                 clear matrix
//   B freq ms         tone
// Sensors sent every 100 ms: "D cm left right a b"
// Safety: motors stop if nothing arrives for 1.5 s or Bluetooth drops.

const CUTEBOT = 0x10
let lastRx = 0
let motorsOn = false
let stopAt = 0
let bleConnected = false
const underglow = pins.createBuffer(6)

function i2c(a: number, b: number, c: number, d: number) {
    const buf = pins.createBuffer(4)
    buf[0] = a; buf[1] = b; buf[2] = c; buf[3] = d
    pins.i2cWriteBuffer(CUTEBOT, buf)
}

function wheel(id: number, speed: number) {
    speed = Math.constrain(Math.round(speed), -100, 100)
    if (speed >= 0) i2c(id, 0x02, speed, 0)
    else i2c(id, 0x01, -speed, 0)
}

function motors(l: number, r: number) {
    wheel(0x01, l)
    wheel(0x02, r)
    motorsOn = l != 0 || r != 0
}

function stopMotors() {
    motors(0, 0)
    stopAt = 0
}

function byte(v: number) {
    return Math.constrain(Math.round(v), 0, 255)
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
    if (cmd == "?") send("CB1")
    else if (cmd == "K") { }
    else if (cmd == "M") {
        motors(n[0] || 0, n[1] || 0)
        const t = n[2] || 0
        stopAt = t > 0 ? control.millis() + Math.min(t, 5000) : 0
    }
    else if (cmd == "S") stopMotors()
    else if (cmd == "H") {
        const side = n[0] || 0
        if (side != 1) i2c(0x04, byte(n[1]), byte(n[2]), byte(n[3]))
        if (side != 0) i2c(0x08, byte(n[1]), byte(n[2]), byte(n[3]))
    }
    else if (cmd == "N") {
        // WS2812 order is GRB
        for (let i = 0; i < 2; i++) {
            underglow[i * 3] = byte(n[1])
            underglow[i * 3 + 1] = byte(n[0])
            underglow[i * 3 + 2] = byte(n[2])
        }
        light.sendWS2812Buffer(underglow, DigitalPin.P15)
    }
    else if (cmd == "V") i2c(n[0] == 2 ? 0x06 : 0x05, Math.constrain(n[1] || 0, 0, 180), 0, 0)
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
    pins.setPull(DigitalPin.P8, PinPullMode.PullNone)
    pins.digitalWritePin(DigitalPin.P8, 0)
    control.waitMicros(2)
    pins.digitalWritePin(DigitalPin.P8, 1)
    control.waitMicros(10)
    pins.digitalWritePin(DigitalPin.P8, 0)
    const us = pins.pulseIn(DigitalPin.P12, PulseValue.High, 25000)
    return us > 0 ? Math.idiv(us, 58) : 0
}

bluetooth.startUartService()
bluetooth.onBluetoothConnected(() => {
    bleConnected = true
    basic.showIcon(IconNames.Yes, 0)
})
bluetooth.onBluetoothDisconnected(() => {
    bleConnected = false
    stopMotors()
    basic.showIcon(IconNames.No, 0)
})
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), () => {
    handle(bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)))
})
serial.setBaudRate(BaudRate.BaudRate115200)
serial.onDataReceived(serial.delimiters(Delimiters.NewLine), () => {
    handle(serial.readUntil(serial.delimiters(Delimiters.NewLine)))
})

pins.setPull(DigitalPin.P13, PinPullMode.PullNone)
pins.setPull(DigitalPin.P14, PinPullMode.PullNone)
stopMotors()
basic.showString("C")

basic.forever(() => {
    const now = control.millis()
    if (stopAt > 0 && now >= stopAt) stopMotors()
    if (motorsOn && now - lastRx > 1500) stopMotors()
    if (now - lastRx < 3000) {
        send("D " + distanceCm() + " " + pins.digitalReadPin(DigitalPin.P13) + " " +
            pins.digitalReadPin(DigitalPin.P14) + " " +
            (input.buttonIsPressed(Button.A) ? 1 : 0) + " " + (input.buttonIsPressed(Button.B) ? 1 : 0))
    }
    basic.pause(100)
})
