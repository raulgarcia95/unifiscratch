// Unifiscratch: sensors and actuators of the XTEC micro:bit kits (MIT, own code).
// Lives next to main.ts (micro:shield firmware) and adds the "X" orders.
// Every order carries an id chosen by the host and gets one reply line:
//   X id DR p            digital read pin p             -> X id value
//   X id AR p            analog read pin p (0..1023)    -> X id value
//   X id US t e          ultrasonic trig t, echo e      -> X id cm
//   X id DH p            DHT11 on pin p                 -> X id temp hum | X id E
//   X id IM              MPU6050 (0x68)                 -> X id ax ay az gx gy gz   (mg, deg/s)
//   X id CO              CCS811 (0x5A/0x5B)             -> X id eco2 tvoc | X id E
//   X id BA              BMP280 (0x76/0x77) or BMP180   -> X id pa temp_x100 | X id E
//   X id IR p            listen to an NEC IR receiver on p -> X id code count
//   X id IS p code       send NEC code (0..255) with an IR LED on p -> X id 0
//   X id OC              OLED SSD1306 (0x3C) init + clear       -> X id 0
//   X id OT row col text OLED text at row 0..7, column 0..20    -> X id 0
//   X id OL row col text the same, then blank the rest of the row
// Values are integers; "E" means the device did not answer.

const KIT_FONT = hex`000000000000005f00000007000700147f147f14242a7f2a12231308646236495522500004030000001c2241000041221c0014083e081408083e080800503000000808080808006060000020100804023e5149453e00427f400042615149462141454b311814127f1027454545393c4a49493001710905033649494936064949291e003636000000563600000814224100141414141400412214080201510906324979413e7e0909097e7f494949363e414141227f4141221c7f494949417f090909013e4149497a7f0808087f00417f41002040413f017f081422417f404040407f020c027f7f0408107f3e4141413e7f090909063e4151215e7f09192946464949493101017f01013f4040403f1f2040201f3f4038403f631408146303047804036151494543007f41410002040810200041417f0004020102044040404040000102040020545454787f484444383844444420384444487f3854545418087e0901020c5252523e7f0804047800447d40002040443d007f1028440000417f40007c041804787c0804047838444444387c14141408081414187c7c080404084854545420043f4440203c4040207c1c2040201c3c4030403c44281028440c5050503c4464544c44000836410000007f0000004136080008040810080609090600`

function kitReply(id: string, text: string) {
    send("X " + id + " " + text)
}

// ---------- plain pins ----------
function kitDistance(t: number, e: number): number {
    if (!freePin(t) || !freePin(e)) return 0
    const trig = pinOf(t)
    const echo = pinOf(e)
    pins.setPull(trig, PinPullMode.PullNone)
    pins.digitalWritePin(trig, 0)
    control.waitMicros(2)
    pins.digitalWritePin(trig, 1)
    control.waitMicros(10)
    pins.digitalWritePin(trig, 0)
    const us = pins.pulseIn(echo, PulseValue.High, 25000)
    return us > 0 ? Math.idiv(us, 58) : 0
}

// ---------- DHT11 ----------
let dhtPin = OFF
let dhtTime = 0
let dhtText = "E"

function dhtWait(pin: DigitalPin, level: number, limit: number): boolean {
    let n = 0
    while (pins.digitalReadPin(pin) != level) {
        if (++n > limit) return false
    }
    return true
}

function dhtRead(p: number): string {
    if (!freePin(p)) return "E"
    // The sensor needs at least 1 s between reads: give the last good value.
    if (p == dhtPin && control.millis() - dhtTime < 1500) return dhtText
    const pin = pinOf(p)
    unwatch(p)
    pins.digitalWritePin(pin, 0)
    basic.pause(20)
    pins.setPull(pin, PinPullMode.PullUp)
    pins.digitalReadPin(pin)
    const data = pins.createBuffer(5)
    let ok = dhtWait(pin, 0, 200) && dhtWait(pin, 1, 200) && dhtWait(pin, 0, 200)
    for (let i = 0; ok && i < 40; i++) {
        ok = dhtWait(pin, 1, 200)
        const start = control.micros()
        ok = ok && dhtWait(pin, 0, 300)
        if (control.micros() - start > 45) data[i >> 3] |= 0x80 >> (i & 7)
    }
    if (!ok || ((data[0] + data[1] + data[2] + data[3]) & 0xff) != data[4]) {
        return p == dhtPin ? dhtText : "E"
    }
    let temp = data[2] * 100 + data[3] * 10
    if (data[3] & 0x80) temp = -(data[2] * 100 + (data[3] & 0x7f) * 10)
    dhtPin = p
    dhtTime = control.millis()
    dhtText = temp + " " + data[0]
    return dhtText
}

// ---------- I2C helpers ----------
function i2cReg(addr: number, reg: number, value: number) {
    const buf = pins.createBuffer(2)
    buf[0] = reg
    buf[1] = value
    pins.i2cWriteBuffer(addr, buf)
}

function i2cRead(addr: number, reg: number, size: number): Buffer {
    pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE, true)
    return pins.i2cReadBuffer(addr, size)
}

// ---------- MPU6050 gyroscope + accelerometer ----------
let imuReady = false

function imuRead(): string {
    if (!imuReady) {
        i2cReg(0x68, 0x6b, 0x00) // wake up
        i2cReg(0x68, 0x1b, 0x00) // +-250 deg/s
        i2cReg(0x68, 0x1c, 0x00) // +-2 g
        imuReady = true
    }
    const b = i2cRead(0x68, 0x3b, 14)
    const v = (i: number) => b.getNumber(NumberFormat.Int16BE, i)
    if (v(0) == 0 && v(2) == 0 && v(4) == 0 && v(8) == 0) {
        imuReady = false
        return "E"
    }
    return Math.round(v(0) * 1000 / 16384) + " " + Math.round(v(2) * 1000 / 16384) + " " +
        Math.round(v(4) * 1000 / 16384) + " " + Math.round(v(8) / 131) + " " +
        Math.round(v(10) / 131) + " " + Math.round(v(12) / 131)
}

// ---------- CCS811 CO2 / TVOC ----------
let co2Addr = 0
let co2Text = "E"

function co2Start(): boolean {
    const addrs = [0x5a, 0x5b]
    for (let k = 0; k < 2; k++) {
        if (i2cRead(addrs[k], 0x20, 1)[0] == 0x81) {
            co2Addr = addrs[k]
            pins.i2cWriteNumber(co2Addr, 0xf4, NumberFormat.UInt8BE) // APP_START
            basic.pause(20)
            i2cReg(co2Addr, 0x01, 0x10) // one measure per second
            return true
        }
    }
    return false
}

function co2Read(): string {
    if (co2Addr == 0 && !co2Start()) return "E"
    const status = i2cRead(co2Addr, 0x00, 1)[0]
    if (status & 0x01) { // error: start again next time
        co2Addr = 0
        return co2Text
    }
    if (status & 0x08) {
        const b = i2cRead(co2Addr, 0x02, 4)
        co2Text = ((b[0] << 8) | b[1]) + " " + ((b[2] << 8) | b[3])
    }
    return co2Text
}

// ---------- barometer: BMP280 (0x76/0x77) or BMP180 (0x77) ----------
let baroAddr = 0
let baroKind = 0 // 280 | 180
let cal: number[] = []

function baroStart(): boolean {
    const addrs = [0x76, 0x77]
    for (let k = 0; k < 2; k++) {
        const chip = i2cRead(addrs[k], 0xd0, 1)[0]
        if (chip == 0x58 || chip == 0x60) {
            baroAddr = addrs[k]
            baroKind = 280
            const b = i2cRead(baroAddr, 0x88, 24)
            cal = [b.getNumber(NumberFormat.UInt16LE, 0)]
            for (let i = 1; i < 12; i++) {
                cal.push(b.getNumber(i == 3 ? NumberFormat.UInt16LE : NumberFormat.Int16LE, i * 2))
            }
            i2cReg(baroAddr, 0xf5, 0xa0)
            i2cReg(baroAddr, 0xf4, 0x27)
            basic.pause(10)
            return true
        }
        if (chip == 0x55) {
            baroAddr = addrs[k]
            baroKind = 180
            const b = i2cRead(baroAddr, 0xaa, 22)
            cal = []
            for (let i = 0; i < 11; i++) {
                cal.push(b.getNumber(i >= 3 && i <= 5 ? NumberFormat.UInt16BE : NumberFormat.Int16BE, i * 2))
            }
            return true
        }
    }
    return false
}

function bmp280(): string {
    const b = i2cRead(baroAddr, 0xf7, 6)
    const adcP = (b[0] << 12) | (b[1] << 4) | (b[2] >> 4)
    const adcT = (b[3] << 12) | (b[4] << 4) | (b[5] >> 4)
    let v1 = (adcT / 16384 - cal[0] / 1024) * cal[1]
    let d = adcT / 131072 - cal[0] / 8192
    const tFine = v1 + d * d * cal[2]
    const temp = tFine / 5120
    v1 = tFine / 2 - 64000
    let v2 = v1 * v1 * cal[8] / 32768 + v1 * cal[7] * 2
    v2 = v2 / 4 + cal[6] * 65536
    v1 = (cal[5] * v1 * v1 / 524288 + cal[4] * v1) / 524288
    v1 = (1 + v1 / 32768) * cal[3]
    if (v1 == 0) return "E"
    let p = (1048576 - adcP - v2 / 4096) * 6250 / v1
    p = p + (cal[11] * p * p / 2147483648 + p * cal[10] / 32768 + cal[9]) / 16
    return Math.round(p) + " " + Math.round(temp * 100)
}

function bmp180(): string {
    i2cReg(baroAddr, 0xf4, 0x2e)
    basic.pause(6)
    let b = i2cRead(baroAddr, 0xf6, 2)
    const ut = (b[0] << 8) | b[1]
    i2cReg(baroAddr, 0xf4, 0x34)
    basic.pause(6)
    b = i2cRead(baroAddr, 0xf6, 3)
    const up = ((b[0] << 16) | (b[1] << 8) | b[2]) >> 8
    // cal: AC1 AC2 AC3 AC4 AC5 AC6 B1 B2 MB MC MD
    let x1 = (ut - cal[5]) * cal[4] / 32768
    let x2 = cal[9] * 2048 / (x1 + cal[10])
    const b5 = x1 + x2
    const b6 = b5 - 4000
    x1 = cal[7] * (b6 * b6 / 4096) / 2048
    x2 = cal[1] * b6 / 2048
    const b3 = (cal[0] * 4 + x1 + x2 + 2) / 4
    x1 = cal[2] * b6 / 8192
    x2 = cal[6] * (b6 * b6 / 4096) / 65536
    const b4 = cal[3] * ((x1 + x2 + 2) / 4 + 32768) / 32768
    let p = (up - b3) * 50000 * 2 / b4
    x1 = (p / 256) * (p / 256) * 3038 / 65536
    x2 = -7357 * p / 65536
    p = p + (x1 + x2 + 3791) / 16
    return Math.round(p) + " " + Math.round((b5 + 8) / 16 * 10)
}

function baroRead(): string {
    if (baroAddr == 0 && !baroStart()) return "E"
    return baroKind == 280 ? bmp280() : bmp180()
}

// ---------- IR (NEC protocol) ----------
let irPin = OFF
let irBits = 0
let irCount = -1
let irCode = -1
let irTotal = 0

function irListen(p: number) {
    if (p == irPin || !freePin(p)) return
    irPin = p
    unwatch(p)
    pins.setPull(pinOf(p), PinPullMode.PullUp)
    // The receiver idles high; the length of each high part carries the data.
    pins.onPulsed(pinOf(p), PulseValue.High, () => {
        const us = pins.pulseDuration()
        if (us > 3500 && us < 5500) { irBits = 0; irCount = 0 }
        else if (us > 1800 && us < 2700) { if (irCode >= 0) irTotal++ } // repeat
        else if (irCount >= 0 && us > 300 && us < 2000) {
            if (us > 1100) irBits |= 1 << irCount
            irCount++
            if (irCount == 32) {
                const cmd = (irBits >> 16) & 0xff
                if (cmd == (~(irBits >> 24) & 0xff)) {
                    irCode = cmd
                    irTotal++
                }
                irCount = -1
            }
        }
    })
}

function irMark(pin: AnalogPin, us: number) {
    pins.analogWritePin(pin, 341)
    control.waitMicros(us)
}

function irSpace(pin: AnalogPin, us: number) {
    pins.analogWritePin(pin, 0)
    control.waitMicros(us)
}

function irSend(p: number, code: number) {
    if (!freePin(p) || p == irPin) return
    unwatch(p)
    const pin = analogPinOf(p)
    pins.analogWritePin(pin, 0)
    pins.analogSetPeriod(pin, 26) // 38 kHz carrier
    const data = ((~code & 0xff) << 24) | ((code & 0xff) << 16) | (0xff << 8)
    irMark(pin, 9000)
    irSpace(pin, 4500)
    for (let i = 0; i < 32; i++) {
        irMark(pin, 560)
        irSpace(pin, (data >> i) & 1 ? 1690 : 560)
    }
    irMark(pin, 560)
    irSpace(pin, 0)
    pins.digitalWritePin(pinOf(p), 0)
}

// ---------- OLED SSD1306 128x64, text only (no frame buffer: saves RAM) ----------
const OLED = 0x3c

function oledCmd(c: number) {
    const buf = pins.createBuffer(2)
    buf[0] = 0x00
    buf[1] = c
    pins.i2cWriteBuffer(OLED, buf)
}

function oledArea(col: number, page: number) {
    oledCmd(0x21); oledCmd(col); oledCmd(127)
    oledCmd(0x22); oledCmd(page); oledCmd(7)
}

function oledClear() {
    const init = [0xae, 0xd5, 0x80, 0xa8, 0x3f, 0xd3, 0x00, 0x40, 0x8d, 0x14, 0x20, 0x00,
        0xa1, 0xc8, 0xda, 0x12, 0x81, 0xcf, 0xd9, 0xf1, 0xdb, 0x40, 0xa4, 0xa6, 0xaf]
    for (let i = 0; i < init.length; i++) oledCmd(init[i])
    oledArea(0, 0)
    const buf = pins.createBuffer(17)
    buf[0] = 0x40
    for (let i = 0; i < 64; i++) pins.i2cWriteBuffer(OLED, buf)
}

function oledText(row: number, col: number, text: string, fill: boolean) {
    row = Math.constrain(row, 0, 7)
    col = Math.constrain(col, 0, 20)
    const count = fill ? 21 - col : Math.min(text.length, 21 - col)
    if (count <= 0) return
    oledArea(col * 6, row)
    const buf = pins.createBuffer(7)
    buf[0] = 0x40
    for (let i = 0; i < count; i++) {
        let c = i < text.length ? text.charCodeAt(i) : 32
        if (c == 0xb0) c = 127 // degree sign
        c = c >= 32 && c <= 127 ? c - 32 : 31 // unknown -> "?"
        for (let k = 0; k < 5; k++) buf[k + 1] = KIT_FONT[c * 5 + k]
        buf[6] = 0
        pins.i2cWriteBuffer(OLED, buf)
    }
}

// ---------- dispatcher ----------
function kitHandle(rest: string) {
    const parts = rest.split(" ")
    const id = parts[0]
    const op = parts[1]
    const a = parseInt(parts[2])
    const b = parseInt(parts[3])
    if (!id || !op) return
    if (op == "DR") {
        if (!freePin(a)) return kitReply(id, "E")
        unwatch(a)
        kitReply(id, "" + pins.digitalReadPin(pinOf(a)))
    }
    else if (op == "AR") {
        if (!freePin(a) || a > 2) return kitReply(id, "E")
        unwatch(a)
        kitReply(id, "" + pins.analogReadPin(analogPinOf(a)))
    }
    else if (op == "US") kitReply(id, "" + kitDistance(a, b))
    else if (op == "DH") kitReply(id, dhtRead(a))
    else if (op == "IM") kitReply(id, imuRead())
    else if (op == "CO") kitReply(id, co2Read())
    else if (op == "BA") kitReply(id, baroRead())
    else if (op == "IR") {
        irListen(a)
        kitReply(id, irCode + " " + irTotal)
    }
    else if (op == "IS") {
        irSend(a, b)
        kitReply(id, "0")
    }
    else if (op == "OC") {
        oledClear()
        kitReply(id, "0")
    }
    else if (op == "OT" || op == "OL") {
        // The text is everything after the fourth space, spaces included.
        let start = 0
        for (let k = 0; k < 4 && start >= 0; k++) start = rest.indexOf(" ", start) + 1
        oledText(a, b, start > 0 ? rest.substr(start) : "", op == "OL")
        kitReply(id, "0")
    }
    else kitReply(id, "E")
}
