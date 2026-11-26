// Unifiscratch firmware for micro:bit + Wappsto:bit (MIT). Own implementation.
//
// The micro:bit listens to Unifiscratch over Bluetooth UART and USB serial
// (115200) with the same text protocol, and talks to the Wappsto:bit board
// over I2C (address 0x11). The I2C frame format follows the public, MIT
// licensed MakeCode extension wappsto/pxt-wappsto; the code here is our own.
//
// Host -> micro:bit, one order per line:
//   ?                  -> replies "WB1"
//   K                  keepalive (host sends every 500 ms)
//   S                  stop: silence the speaker and set pins 0-2 to 0
//   I bits             LED matrix, 25-bit number (bit 0 = top-left)
//   T text             scroll text
//   C                  clear matrix
//   B freq ms          tone
//   P pin v            digital write (pins 0, 1, 2)
//   A pin v            analog write 0..1023 (pins 0, 1, 2)
//   R pin d|a          read pin -> replies "R pin value"
//   N name             Wappsto device name
//   V id tpl name      Wappsto number value id 1..15 from template 0..9
//   G id name          Wappsto text value id 16..20
//   L id               create a value that Wappsto can control
//   U id number        send a number to Wappsto
//   X id text          send a text to Wappsto
//   Z                  clear the data model on Wappsto
// micro:bit -> host:
//   D a b temp light ax ay az        every 100 ms while the host talks
//   E online signal lat lon          every second
//   W id text                        value sent from Wappsto (dashboard/app)
//
// Wappsto settings (name, values) are kept and sent again every time the
// Wappsto:bit comes online, so they can be given before it is connected.

const WAPPSTO = 0x11
const HEADER_LEN = 7
// Command and response numbers of the Wappsto:bit I2C protocol.
const CMD_DEVICE_NAME = 0
const CMD_VALUE_DEFAULT = 1
const CMD_VALUE_NAME = 2
const CMD_VALUE_TYPE = 3
const CMD_RANGE_MIN = 4
const CMD_RANGE_MAX = 5
const CMD_RANGE_STEP = 6
const CMD_UNIT = 7
const CMD_DATA = 8
const CMD_INFO = 9
const CMD_CLEAN = 14
const RES_CTRL = 1
const RES_INFO = 2
const RES_UPTIME = 3
const RES_UTC = 4
const RES_LOCATION = 5

let lastRx = 0
let bleConnected = false
let online = false
let queueFull = false
let signal = 0
let latitude = "NaN"
let longitude = "NaN"
let deviceName = "Unifiscratch"
// Per value id (1..20): "" not configured, otherwise the setup line.
const setups: string[] = []
const listening: boolean[] = []
for (let i = 0; i <= 20; i++) {
    setups.push("")
    listening.push(false)
}

function send(text: string) {
    serial.writeString(text + "\n")
    if (bleConnected) bluetooth.uartWriteString(text + "\n")
}

// ---------- Wappsto:bit over I2C ----------

function utf8(text: string): number[] {
    const out: number[] = []
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i)
        if (c < 0x80) out.push(c)
        else if (c < 0x800) {
            out.push(0xc0 | (c >> 6))
            out.push(0x80 | (c & 0x3f))
        } else {
            out.push(0xe0 | (c >> 12))
            out.push(0x80 | ((c >> 6) & 0x3f))
            out.push(0x80 | (c & 0x3f))
        }
    }
    return out
}

// Frame: 0x42 0x21 version=2 length crc(2 bytes, fixed 0x4321) command, then
// the payload. Texts end with a zero byte. Value texts get the same room as
// in the original extension (2 bytes per character), padded with zeros.
function frame(cmd: number, head: number[], text: string, roomy = true): Buffer {
    const bytes = text == null ? [] : utf8(text)
    const room = roomy && text != null ? Math.max(bytes.length, text.length * 2) : bytes.length
    const size = HEADER_LEN + head.length + (text == null ? 0 : room + 1)
    const buf = pins.createBuffer(Math.min(size, 64))
    buf[0] = 0x42
    buf[1] = 0x21
    buf[2] = 2
    buf[3] = buf.length
    buf.setNumber(NumberFormat.UInt16LE, 4, 0x4321)
    buf[6] = cmd
    for (let i = 0; i < head.length; i++) buf[HEADER_LEN + i] = head[i]
    const start = HEADER_LEN + head.length
    for (let i = 0; i < bytes.length && start + i < buf.length - 1; i++) buf[start + i] = bytes[i]
    return buf
}

function write(buf: Buffer) {
    basic.pause(50) // let the I2C buffer empty
    pins.i2cWriteBuffer(WAPPSTO, buf, false)
}

// Only while the board is online; waits (max. 3 s) if its queue is full.
function writeOnline(buf: Buffer) {
    if (!online) return
    const until = control.millis() + 3000
    while (queueFull && control.millis() < until) basic.pause(100)
    write(buf)
}

function valueText(cmd: number, id: number, text: string) {
    writeOnline(frame(cmd, [1, id], text))
}

const TEMPLATES = [
    "temperature|-5|50|1|°C",
    "light level|0|255|1|",
    "compass heading|0|360|1|°",
    "acceleration|-1024|1024|1|mg",
    "rotation|0|360|1|°",
    "magnetic force|-40|40|0.001|µT",
    "number|-1000000000000|1000000000000|1|",
    "latitude|-90|90|0.000001|°N",
    "longitude|-180|180|0.000001|°E",
    "sound level|0|255|1|"
]

function applySetup(id: number) {
    const line = setups[id]
    if (line.length == 0) return
    const kind = line.charAt(0)
    const rest = line.substr(2)
    if (kind == "V") {
        const space = rest.indexOf(" ")
        const tpl = parseInt(space < 0 ? rest : rest.substr(0, space))
        const name = space < 0 ? "Value " + id : rest.substr(space + 1)
        const t = TEMPLATES[Math.constrain(tpl || 0, 0, TEMPLATES.length - 1)].split("|")
        valueText(CMD_RANGE_MIN, id, t[1])
        valueText(CMD_RANGE_MAX, id, t[2])
        valueText(CMD_RANGE_STEP, id, t[3])
        valueText(CMD_UNIT, id, t[4])
        valueText(CMD_VALUE_TYPE, id, t[0])
        valueText(CMD_VALUE_NAME, id, name)
    } else {
        valueText(CMD_VALUE_TYPE, id, "string")
        valueText(CMD_VALUE_NAME, id, rest)
    }
}

// Called once each time the Wappsto:bit comes online.
function sendModel() {
    writeOnline(frame(CMD_DEVICE_NAME, [1], deviceName, false))
    for (let id = 1; id <= 20; id++) {
        applySetup(id)
        if (listening[id]) writeOnline(frame(CMD_VALUE_DEFAULT, [1, id], null))
    }
}

function zeroEnd(buf: Buffer, start: number, length: number): string {
    let end = start
    const stop = Math.min(buf.length, start + Math.max(length, 0))
    while (end < stop && buf[end] != 0 && buf[end] != 0xff) end++
    return end > start ? buf.slice(start, end - start).toString() : ""
}

function handleInfo(buf: Buffer) {
    signal = buf[9]
    queueFull = buf[8] == 1
    if (buf[7] == 1 && !online) {
        online = true
        control.inBackground(sendModel)
    } else if (buf[7] == 0) {
        online = false
    }
}

function readBoard() {
    const buf = pins.i2cReadBuffer(WAPPSTO, 64, false)
    if (buf[0] != 0x42 || buf[1] != 0x21) return
    const length = Math.min(buf[3], 64)
    const res = buf[6]
    if (res == RES_CTRL) {
        const id = buf[8]
        const text = zeroEnd(buf, 9, length - 9)
        send("W " + id + " " + text)
    } else if (res == RES_INFO || res == RES_UPTIME || res == RES_UTC) {
        handleInfo(buf)
    } else if (res == RES_LOCATION) {
        handleInfo(buf)
        const lat = clean(zeroEnd(buf, 10, 12))
        const lon = clean(zeroEnd(buf, 22, 12))
        if (lat.length > 0 && parseFloat(lat) != 0) latitude = lat
        if (lon.length > 0 && parseFloat(lon) != 0) longitude = lon
    }
}

// ---------- Orders from Unifiscratch ----------

function clean(text: string): string {
    let start = 0
    let end = text.length
    while (start < end && text.charCodeAt(start) <= 32) start++
    while (end > start && text.charCodeAt(end - 1) <= 32) end--
    return text.substr(start, end - start)
}

function pinOf(n: number): DigitalPin {
    if (n == 1) return DigitalPin.P1
    if (n == 2) return DigitalPin.P2
    return DigitalPin.P0
}

function analogPinOf(n: number): AnalogPin {
    if (n == 1) return AnalogPin.P1
    if (n == 2) return AnalogPin.P2
    return AnalogPin.P0
}

function showBits(bits: number) {
    for (let i = 0; i < 25; i++) {
        if ((bits >> i) & 1) led.plot(i % 5, Math.idiv(i, 5))
        else led.unplot(i % 5, Math.idiv(i, 5))
    }
}

function validId(id: number, min: number, max: number): boolean {
    return id >= min && id <= max
}

function stopAll() {
    music.stopAllSounds()
    for (let p = 0; p <= 2; p++) pins.digitalWritePin(pinOf(p), 0)
}

function handle(line: string) {
    line = clean(line)
    if (line.length == 0) return
    lastRx = control.millis()
    const cmd = line.charAt(0)
    const rest = clean(line.substr(1))
    const n = rest.split(" ").map(s => parseInt(s))
    // Text after the first number (value id).
    const space = rest.indexOf(" ")
    const tail = space < 0 ? "" : clean(rest.substr(space + 1))
    if (cmd == "?") send("WB1")
    else if (cmd == "K") { }
    else if (cmd == "S") stopAll()
    else if (cmd == "I") showBits(n[0] || 0)
    else if (cmd == "T") control.inBackground(() => basic.showString(rest, 80))
    else if (cmd == "C") basic.clearScreen()
    else if (cmd == "B") {
        const f = n[0] || 440
        const ms = Math.constrain(n[1] || 200, 0, 3000)
        control.inBackground(() => music.playTone(f, ms))
    }
    else if (cmd == "P") pins.digitalWritePin(pinOf(n[0]), n[1] ? 1 : 0)
    else if (cmd == "A") pins.analogWritePin(analogPinOf(n[0]), Math.constrain(n[1] || 0, 0, 1023))
    else if (cmd == "R") {
        const value = tail == "a" ? pins.analogReadPin(analogPinOf(n[0])) : pins.digitalReadPin(pinOf(n[0]))
        send("R " + (n[0] || 0) + " " + value)
    }
    else if (cmd == "N") {
        if (rest.length > 0) deviceName = rest
        writeOnline(frame(CMD_DEVICE_NAME, [1], deviceName, false))
    }
    else if (cmd == "V" && validId(n[0], 1, 15)) {
        setups[n[0]] = "V " + tail
        applySetup(n[0])
    }
    else if (cmd == "G" && validId(n[0], 16, 20)) {
        setups[n[0]] = "G " + tail
        applySetup(n[0])
    }
    else if (cmd == "L" && validId(n[0], 1, 20)) {
        listening[n[0]] = true
        writeOnline(frame(CMD_VALUE_DEFAULT, [1, n[0]], null))
    }
    else if ((cmd == "U" && validId(n[0], 1, 15)) || (cmd == "X" && validId(n[0], 16, 20))) {
        valueText(CMD_DATA, n[0], tail)
    }
    else if (cmd == "Z") {
        // Like the original extension, clean is sent even when offline.
        write(frame(CMD_CLEAN, [], null))
    }
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

basic.showString("W")

// Reads what the Wappsto:bit has for us.
control.inBackground(() => {
    while (true) {
        readBoard()
        basic.pause(20)
    }
})

// Asks the Wappsto:bit for its state every 5 s.
control.inBackground(() => {
    while (true) {
        write(frame(CMD_INFO, [], null))
        basic.pause(5000)
    }
})

let lastStatus = 0
basic.forever(() => {
    const now = control.millis()
    if (now - lastRx < 3000) {
        send("D " + (input.buttonIsPressed(Button.A) ? 1 : 0) + " " + (input.buttonIsPressed(Button.B) ? 1 : 0) +
            " " + input.temperature() + " " + input.lightLevel() + " " + input.acceleration(Dimension.X) +
            " " + input.acceleration(Dimension.Y) + " " + input.acceleration(Dimension.Z))
        if (now - lastStatus >= 1000) {
            lastStatus = now
            send("E " + (online ? 1 : 0) + " " + signal + " " + latitude + " " + longitude)
        }
    }
    basic.pause(100)
})
