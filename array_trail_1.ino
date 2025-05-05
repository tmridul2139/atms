#include <WiFi.h>
#include <HTTPClient.h>
#include <SoftwareSerial.h>
#include <GT5X.h>

const char* ssid = "Esp32";
const char* password = "12349876";

// ✅ Google Apps Script URL for posting data
const char* postUrl = "https://script.google.com/macros/s/AKfycbx8QB3tj2iDwHlSKC6sjblMQDXutLFhMWBuK9YQkxla8jCqVbVAu-Cdl7STpOPB0l6B/exec";

SoftwareSerial fserial(16, 17);
GT5X finger(&fserial);
GT5X_DeviceInfo ginfo;

struct FingerData {
  int id;
  const char* name;
};

// ✅ Local fingerprint ID-to-name mapping
FingerData fingerData[] = {
  {1, "PRISHA GUPTA"}, {2, "PRINCE KUMAR"}, {3, "Aman Gupta"}, {4, "DUSHYANT SINGH"}, {5, "AMOL RATHOD"},
  {6, "DHRUV GROVER"}, {7, "SHIVAM"}, {8, "ASMITA KHANDELWAL"}, {9, "LAVYA GUPTA"}, {10, "LAKSHAY SHARMA"},
  {11, "LAKSHAY KAUSHIK"}, {12, "PIYUSH"}, {13, "TUSHAR THAKRYAN"}, {14, "RONAK DUTTA"}, {15, "AMAN KUMAR"},
  {16, "ADITYA JAIN"}, {17, "SAMAY SHARMA"}, {18, "KUSHANK SHARMA"}, {20, "ADITYA VARSHNEY"}, {21, "VATSAL KUMAR"},
  {22, "SHRIYANSH YADAV"}, {23, "MRIDUL MAKKAR"}, {24, "RUCHIRA CHAUBEY"}, {25, "KSHITIJ CHAUHAN"},
  {26, "SAMARTH SAXENA"}, {27, "PRANAV BISHT"}, {28, "VISHAL DEV"}, {29, "HARSH RAJ"}, {30, "ARYAN MALHOTRA"},
  {31, "VANSHIKA MISHRA"}, {32, "MD SALIK INAM"}, {33, "ROHAN KUMAR"}, {34, "KARTIK CHACHRA"},
  {35, "MAHENDRA KUMAR"}, {36, "KASHISH"}, {37, "HARSH KUMAR"}, {38, "NIKHIL"}, {40, "SHASHWAT KUMAR"},
  {41, "SUJAL SINGH"}, {42, "DIVYANSHI PANCHAL"}, {43, "PRIYANSHU RAJ"}, {44, "CHITRANSH KOSHTA"},
  {45, "PRASHANT PULKIT"}, {46, "PRINCE KUMAR SINGH"}, {47, "ZAKI MOHSIN"}, {48, "ABHINAV SHARMA"},
  {49, "ARYAN RAI"}, {50, "VEDAANT MITRA"}, {51, "PRANAV R"}, {52, "ISHIKA PANDEY"}, {53, "DAKSH JAIN"},
  {54, "SONU"}, {56, "ASHISH CHAUHAN"}, {57, "RISHI ATTRI"}, {58, "AGRIM NARANG"}, {59, "PARIKSHIT PANDEY"},
  {60, "SOHAM KHANNA"}, {61, "VYOM SINGHAL"}, {63, "OCEAN BHATNAGAR"}, {64, "KHUSHAL GUPTA"},
  {65, "PRABHAKAR"}, {66, "Santanu Ojha"}, {67, "Aayush Chaudhary"}, {68, "Samridh Singh"},
  {69, "Akshita garg"}, {70, "Kunal"}, {73, "Aditya Saini"}, {75, "GAURAV KUMAR GUPTA"},
  {76, "Aniket Kumar"}, {77, "Ved Prakash"}, {80, "Abubakar Siddiqui"}, {81, "TANYA GUPTA"},
  {82, "Harshit Pandey"}, {83, "Abhinav singh"}, {84, "Rudransh Mishra"}, {85, "Rishabh Verma"},
  {86, "uttam kumar"}, {87, "Aadhish Raj"}, {88, "Lokesh Gupta"}, {89, "Dhruv Sharma"},
  {90, "ABHIJEET KUMAR"}, {91, "Satyam Kumar"}, {92, "ABHIJEET RAJ CHAURASIYA"},
  {93, "Aniket Pokhriyal"}, {94, "Shikher jha"}, {95, "Vansh Dabas"}, {97, "Mayank"}, {98, "Sumit Sengar"},
  {99, "Vishesh Gahlot"}, {100, "Rachit Sanjeev Soni"}, {102, "Ankit Singh Lingwal"},
  {103, "GAGAN KUMAR CHAUHAN"}, {104, "Chand Mohammad"}, {105, "Aviral Garg"},
  {106, "Chaitanya Sharma"}, {107, "Aryan mehar"}, {108, "Siddharth Raj"}, {109, "Mohit Kumar Singh"},
  {110, "SHUBHAM CHAUDHARY"}, {111, "Abhinav Bhatt"}, {112, "Mohammad Wasiq Mirza"},
  {113, "Naman rathore"}, {116, "Ansh Singh"}, {117, "Tanu Shree Gupta"}, {118, "Vedant Mishra"},
  {120, "Ashutosh Priyanshu"}, {121, "Shubham Kumar"}, {122, "Sadiq Mohd Khan"},
  {123, "Sanyam Pandey"}, {124, "Adi Adity Singh"}, {125, "Charu Bisht"}, {126, "Kshitij Saxena"},
  {127, "Hardik Jaiswal"}, {128, "Harshit Sharma"}, {129, "Rishabh bhardwaj"},
  {201, "SHANTANU SHARMA"}, {202, "Parth Gupta"}, {601, "Ayushi Kumari"}, {602, "Shivaji gaur"},
  {603, "Gurmehar Singh"}, {604, "DEVASHISH KAUSHIK"}, {605, "Harsh chaube"},
  {606, "Hargun singh"}, {607, "NIDHI"}, {608, "Aditya Rawat"}, {609, "Harsh"},
  {610, "PRASHANT DHIMAN"}, {611, "ROSHANI"}, {612, "KARAN DEEP KINYAL"}
};

const int dataSize = sizeof(fingerData) / sizeof(fingerData[0]);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  fserial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }

  Serial.println("Connected!");

  if (finger.begin(&ginfo)) {
    Serial.println("Found fingerprint sensor!");
    Serial.print("Firmware Version: ");
    Serial.println(ginfo.fwversion);
  } else {
    Serial.println("Fingerprint sensor not found!");
    while (1) yield();
  }

  Serial.println("Place a finger to search.");
  finger.set_led(true);
}

void loop() {
  if (!finger.is_pressed()) return;

  uint16_t rc = finger.capture_finger();
  if (rc != GT5X_OK) return;

  uint16_t fid;
  rc = finger.search_database(&fid);
  if (rc != GT5X_OK) {
    blinkLED(1);
    Serial.println("Unauthorized fingerprint!");
    return;
  }

  String name = getFingerprintNameFromArray(fid);
  blinkLED(1);

  Serial.print("Fingerprint ID: ");
  Serial.println(fid);
  Serial.print("Name: ");
  Serial.println(name);

  sendToGoogleSheets(fid, name);
  delay(1000);
}

String getFingerprintNameFromArray(int id) {
  for (int i = 0; i < dataSize; i++) {
    if (fingerData[i].id == id) {
      return String(fingerData[i].name);
    }
  }
  return "unknown";
}

void sendToGoogleSheets(int id, String name) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(postUrl);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\"id\":" + String(id) + ", \"name\":\"" + name + "\"}";
    int httpResponseCode = http.POST(jsonPayload);

    Serial.print("Response Code: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode == 302 || httpResponseCode == 200) {
      Serial.println("✅ Data sent successfully!");
      blinkLED(3);
    } else {
      Serial.println("❌ Failed to send data.");
    }

    http.end();
  } else {
    Serial.println("WiFi Disconnected. Data not sent.");
  }
}

void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(200);
    digitalWrite(LED_BUILTIN, LOW);
    delay(200);
  }
}
