
#include <SoftwareSerial.h>
#include <GT5X.h>

/* Search the fingerprint database for a print */

/*  pin #2 is IN from sensor
 *  pin #3 is OUT from arduino (3.3V I/O!)
 */
SoftwareSerial fserial(16, 17);

GT5X finger(&fserial);
GT5X_DeviceInfo ginfo;

void setup() {
    Serial.begin(9600);
    Serial.println("Starting serial...");
    fserial.begin(9600);

    if (finger.begin(&ginfo)) {
        Serial.println("Found fingerprint sensor!");
        Serial.print("Firmware Version: ");
        Serial.println(ginfo.fwversion);
    } else {
        Serial.println("Did not find fingerprint sensor :(");
        while (1) yield();
    }
}

void loop() {
    while (Serial.read() != -1);  // clear buffer
    
    Serial.println("Enter the finger ID # you want to enroll...");
    uint16_t fid = 0;
    while (true) {
        while (! Serial.available()) yield();
        char c = Serial.read();
        if (! isdigit(c)) break;
        fid *= 10;
        fid += c - '0';
        yield();
    }
    
    if (is_enrolled(fid))
        return;
    
    enroll_finger(fid);
    Serial.println();
}

bool is_enrolled(uint16_t fid) {
    uint16_t rc = finger.is_enrolled(fid);
    switch (rc) {
        case GT5X_OK:
            Serial.println("ID is used!");
            return true;
        case GT5X_NACK_IS_NOT_USED:
            Serial.print("ID "); Serial.print(fid);
            Serial.println(" is free.");
            return false;
        default:
            Serial.print("Error code: 0x"); Serial.println(rc, HEX);
            return true;
    }
}

void enroll_finger(uint16_t fid) {    
    uint16_t p = finger.start_enroll(fid);
    switch (p) {
        case GT5X_OK:
            Serial.print("Enrolling ID #"); Serial.println(fid);
            break;
        default:
            Serial.print("Error code: 0x"); Serial.println(p, HEX);
            return;
    }

    /* turn on led for print capture */
    finger.set_led(true);

    /* scan finger 3 times */
    for (int scan = 1; scan < 4; scan++) {
        Serial.println("Place your finger.");
        p = finger.capture_finger(true);
        
        while (p != GT5X_OK) {
            p = finger.capture_finger(true);
            switch (p) {
                case GT5X_OK:
                    Serial.println("Image taken.");
                    break;
                case GT5X_NACK_FINGER_IS_NOT_PRESSED:
                    Serial.println(".");
                    break;
                default:
                    Serial.print("Error code: 0x"); Serial.println(p, HEX);
                    return;
            }
            yield();
        }

        p = finger.enroll_scan(scan);
        switch (p) {
            case GT5X_OK:
                Serial.print("Scan "); Serial.print(scan);
                Serial.println(" complete.");
                break;
            case GT5X_NACK_ENROLL_FAILED:
                Serial.print("Enrollment failed.");
                return;
            case GT5X_NACK_BAD_FINGER:
                Serial.print("Fingerprint unclear.");
                return;
            default:
                Serial.print("Print already exists at ID "); Serial.println(p);
                return;
        }

        Serial.println("Remove finger.");
        while (finger.is_pressed()) {
            yield();
        }
        Serial.println();
    }

    /* wr're done so turn it off */
    finger.set_led(false);
    
    Serial.println("Enroll complete.");
}
