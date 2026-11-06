#-------------Setup----------------

import Ed

Ed.EdisonVersion = Ed.V3
Ed.DistanceUnits = Ed.CM
Ed.Tempo = Ed.TEMPO_MEDIUM

#--------Your code below-----------
# Unfyscratch bridge for Edison V3, version 1.
# Load it once from https://www.edpyapp.com/v3/ (Program Edison).
# Unfyscratch sends numbered orders: number = order_id*4096 + command*256 + value.
# Each movement has a fixed distance or angle, so Edison stops by itself.
# Reply sent to Unfyscratch: order_id*4096 + result.

Ed.ObstacleDetectionBeam(Ed.ON)
Ed.LineTrackerLed(Ed.ON)
lastOrder = 0
Ed.PlayBeep()

while True:
    data = Ed.ReadUSB()
    order = data / 4096
    if data > 0:
        if order != lastOrder:
            lastOrder = order
            rest = data - order * 4096
            command = rest / 256
            value = rest - command * 256
            result = 0
            if command == 1:
                Ed.Drive(Ed.FORWARD, Ed.SPEED_5, value)
            elif command == 2:
                Ed.Drive(Ed.BACKWARD, Ed.SPEED_5, value)
            elif command == 3:
                Ed.Drive(Ed.SPIN_RIGHT, Ed.SPEED_5, value * 2)
            elif command == 4:
                Ed.Drive(Ed.SPIN_LEFT, Ed.SPEED_5, value * 2)
            elif command == 5:
                left = value - (value / 2) * 2
                right = value / 2
                if left == 1:
                    Ed.LeftLed(Ed.ON)
                else:
                    Ed.LeftLed(Ed.OFF)
                if right == 1:
                    Ed.RightLed(Ed.ON)
                else:
                    Ed.RightLed(Ed.OFF)
            elif command == 6:
                Ed.PlayBeep()
            elif command == 7:
                if value == 1:
                    obstacle = Ed.ReadObstacleDetection()
                    if obstacle == Ed.OBSTACLE_LEFT:
                        result = 1
                    elif obstacle == Ed.OBSTACLE_RIGHT:
                        result = 2
                    elif obstacle == Ed.OBSTACLE_AHEAD:
                        result = 3
                elif value == 2:
                    if Ed.ReadLineState() == Ed.LINE_ON_BLACK:
                        result = 1
                elif value == 3:
                    result = Ed.ReadLeftLightLevel()
                elif value == 4:
                    result = Ed.ReadRightLightLevel()
                elif value == 5:
                    keypad = Ed.ReadKeypad()
                    if keypad == Ed.KEYPAD_TRIANGLE:
                        result = 1
                    elif keypad == Ed.KEYPAD_ROUND:
                        result = 2
                elif value == 6:
                    if Ed.ReadClapSensor() == Ed.CLAP_DETECTED:
                        result = 1
            elif command == 9:
                result = 3001
            Ed.WriteUSB(order * 4096 + result)
