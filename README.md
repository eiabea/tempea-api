# Tempea

[![Build Status](https://travis-ci.org/eiabea/tempea-api.svg?branch=master)](https://travis-ci.org/eiabea/tempea-api)
[![codecov](https://codecov.io/gh/eiabea/tempea-api/branch/master/graph/badge.svg)](https://codecov.io/gh/eiabea/tempea-api)

# Motivation

The thermostat in our flat was pretty basic, so I decided to build my own one based on a [Raspberry Pi](https://www.raspberrypi.org/), [Docker](https://www.docker.com/), [InfluxDB](https://www.influxdata.com/), [node.js](https://nodejs.org/en/), a small PCB with a relay to control a gas boiler and a temperature sensor.

[Grafana](https://grafana.com/) is used to plot temperature and heating period graphs.

After some research I stumbled over the great idea to use [Google Calender](https://calendar.google.com) to set a desired temperature. This reduced the complexity of the node application drastically and made it obsolete to expose the Raspberry Pi to the internet for remote management. 

# Table of Contents
- [Setup](#setup)
  - [System](#system)
    - [Raspbian](#raspbian)
    - [Docker](#docker)
  - [Hardware](#hardware)
    - [Breadboard](#breadboard)
    - [Schematics](#schematics)
    - [Parts](#parts)
  - [Software](#software)
    - [OneWire](#onewire)
    - [Setup Tempea](#setup-tempea)
    - [Setup Calendar](#setup-calendar)
    - [Start](#start)
  - [Grafana](#grafana)
  - [Develop](#develop)
    - [Linux](#linux)
  - [Testing](#testing)
  - [Contribute](#contribute)

# Setup

## System

### Raspbian

1. Get the latest lite version of raspbian from the official [download page](https://www.raspberrypi.org/downloads/raspbian/)

2. Unzip the image
```
$ unzip 2018-11-13-raspbian-stretch-lite.zip
```

3. Insert your sd card into your PC

4. Run the following command to find out the name of your sd card
```
$ dmesg
```

5. Flash the previously downloaded image using dd (may requires root permissions) to your sd card
```
# dd if=/home/eiabea/2018-11-13-raspbian-stretch-lite.img of=/dev/mmcblk0 bs=4M && sync
```

6. Wait until the command has finished successfully

7. Remove and reinsert your sd card (to initialize your sd card again)

8. To set a static ip address open up the _etc/network/interfaces_ file on your sd card and paste the following content (may requires root permissions)
```
# interfaces(5) file used by ifup(8) and ifdown(8)

# Please note that this file is written to be used with dhcpcd
# For static IP, consult /etc/dhcpcd.conf and 'man dhcpcd.conf'

# Include files from /etc/network/interfaces.d:
source-directory /etc/network/interfaces.d

auto lo
iface lo inet loopback

iface eth0 inet manual
```

9. Open up the _etc/dhcpcd.conf_ file and add the following content at the end of the file. Edit all values according to your network (may requires root permissions)
```
interface eth0
static ip_address=192.168.0.8/24
static routers=192.168.0.1
static domain_name_servers=192.168.0.1 8.8.8.8 4.2.2.1
```

10. Create a blank file on the boot partition named ssh to enable ssh
```
$ touch ssh
```

11. Unmount and remove your sd card from your PC and insert it into your Raspberry Pi

12. Connect a ethernet cable between your router and the Raspberry Pi

13. Connect the power supply to boot up your Raspberry Pi

14. Login via ssh (username: pi, password: raspberry)
```
$ ssh pi@192.168.0.8
```

15. Update the system to the latest version
```
$ sudo apt update && sudo apt upgrade -y
```

### Docker

1. Run the following command to install docker
```
$ curl -sSL https://get.docker.com | sh
```

2. Add the pi user to the docker group to start container as user
```
$ sudo usermod -aG docker pi
```

3. Log out and in again to gain access to docker

4. Verify the correct installation of docker
```
$ docker ps
```

5. Install docker-compose
```
$ sudo apt install -y python-pip
$ sudo pip install docker-compose
```

6. Verify the correct installation of docker-compose
```
$ docker-compose version
```

## Hardware

### Breadboard

For running tempea the Raspberry Pi needs to be connected to some peripherals. In this case, a transistor driven relay is used to turn on a gas boiler and a digital temperature sensor with a one wire interface ([DS18B20](https://www.sparkfun.com/products/245))

### Schematics

The schematics for this step can be found [here](https://github.com/eiabea/tempea-api/tree/master/schematic) and are created with [Fritzing](fritzing.org/home/)

### Parts

- Breadboard
- Wires
- Resistors (1kOhm, 4,7kOhm)
- [1N4004](https://www.sparkfun.com/products/14884) 
- [DS18B20](https://www.sparkfun.com/products/245)
- [833H-1C-C](https://www.alibaba.com/product-detail/Relay-833H-1C-C-05VDC-TRD_60699398858.html?spm=a2700.7724838.2017115.35.77e36478QeKaZy)
- [BC547](https://www.alibaba.com/product-detail/KEHE-bc547b-Transistor-TO92-bc547b-bc547_60786655233.html?spm=a2700.7724838.2017115.1.43036a93qsSS1L&s=p)

The following images in combination with the schematics should make it easy to build up the circuit. Please note, that my relay had a different pinout than shown in the schematic. Check the data sheet of your relay to wire it up correctly. The relay should work as a closer, so if no power is supplied the outgoing pins must not be connected!

<p align="center">
  <a href="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/rpi_breadboard.jpg" target="_blank">
    <img src="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/rpi_breadboard.jpg" width="350" alt="RaspberryPi with Breadboard">
  </a>
  <a href="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/gpio_closeup.jpg" target="_blank">
    <img src="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/gpio_closeup.jpg" width="350" alt="GPIO Closeup">
  </a>
  <a href="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/breadboard_closeup.jpg" target="_blank">
    <img src="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/breadboard_closeup.jpg" width="350" alt="Breadboard Closeup">
  </a>
</p>

## Software

### OneWire

In order to get data from the [DS18B20](https://www.sparkfun.com/products/245), the one wire interface of the Raspberry Pi has to be enabled. Open up _/boot/config.txt_ and add the following lines at the end of the file

```
# OneWire
dtoverlay=w1-gpio,gpiopin=4,pullup=on
```

After rebooting, it should be able to see the connected sensor

```
$ ls /sys/bus/w1/devices/
10-00080278b776  w1_bus_master1
```

Take a note of the name (e.g. 10-00080278b776) of the slave, it will be needed in the following steps

### Obtaining Google Calendar Service JSON

1. Login at [Google Developer Console](https://console.developers.google.com)

2. Create a new project (e.g.: tempea)

<p align="center">
  <a href="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/gdc_create_project.png" target="_blank">
    <img src="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/gdc_create_project.png" width="350" alt="GDC create project">
  </a>
</p>

3. Click "Enable APIs and Services"

4. Search for "Google Calendar API" and enable it

5. In the side menu click on "IAM & admin" - "Service accounts"

6. Create a new service account (leave optional fields empty)

7. Create a new JSON key for your service account

Service json file (example)

```
{
  "type": "service_account",
  "project_id": "tempea",
  "private_key_id": "bbc5f5b4422b7848d47cf2a4221c47ec1718f071",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEDAI=\n-----END PRIVATE KEY-----\n",
  "client_email": "tempea@tempea.iam.gserviceaccount.com",
  "client_id": "108968564556464390537",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/tempea%40tempea.iam.gserviceaccount.com"
}

```

### Setup tempea

1. Connect to the Raspberry Pi via ssh (username: pi, password: raspberry)
```
$ ssh pi@192.168.0.8
```

2. Create tempea directory
```
$ mkdir tempea
```

3. Change into the tempea directory
```
$ cd tempea
```

4. Create secrets directory and copy/paste your google-service.json content into a new file called _tempea-service.json_
```
$ mkdir secrets
$ nano secrets/tempea-service.json
```

5. Download the latest _docker-compose-production.yml_
```
$ wget -O docker-compose.yml https://raw.githubusercontent.com/eiabea/tempea-api/master/docker-compose-production.yml
```

6. Open up the _docker-compose.yml_ file and change the environment section of the tempea service according to your needs/setup
```
environment:
  # Google
  GOOGLE_SERVICE_ACCOUNT_JSON: "tempea-service.json"  # Name of the google service json file
  GOOGLE_CALENDAR_ID: "developer@eiabea.com"          # Email address of your service account
  # Modules
  ROUTING_MODULE_HOST: "0.0.0.0"                      # Host option of the node application
  ROUTING_MODULE_PORT: "3000"                         # Port definition
  # Database
  #  Influx
  INFLUX_HOST: "influx"
  INFLUX_PORT: "8086"
  INFLUX_DB: "temp"
  # Hardware
  SENSOR_ID: "10-00080278b776"                        # Address of your OneWire sensor noted in the "OneWire"-section
  # Slave
  SLAVE_ENABLED: "true"                               # Enable/Disable slave feature
  SLAVE_HOST: "192.168.0.7"                           # Host of the slave
  SLAVE_PORT: "3000"                                  # Port of the slave
  SLAVE_ENDPOINT: "/v1/status"                        # Endpoint of the slave to get data from
  # Celius (float)
  MAX_TEMP: "25"                                      # Maximal temperature accepted
  MIN_TEMP: "15"                                      # Minimal temperature accepted
  OVERSHOOT_TEMP: "0.5"                               # How much degrees should be "overheated"
  # Minutes
  FETCHING_INTERVAL: "1"                              # How often should the calendar be checked
```

7. Download the latest telegraf.conf
```
$ wget https://raw.githubusercontent.com/eiabea/tempea-api/master/telegraf.conf
```

### Setup calendar

1. Login to your [Google Calendar](https://calendar.google.com)

2. Add the calendar of your service account (e.g.: tempea@tempea.iam.gserviceaccount.com)

3. Create a new event in this calendar with the desired temperature in the summary (e.g.: 21.5)

<p align="center">
  <a href="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/calendar_event.png" target="_blank">
    <img src="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/calendar_event.png" width="350" alt="Calendar event">
  </a>
</p>

4. Create more events in the same manner in order to set different temperatures on different dates/time. Keep in mind, that all days should be covered by a specific event, otherwise tempea will fallback to the MIN_TEMP for this period.

### Start

Tempea can be started by simply run the following command in the project directory
```
$ docker-compose up -d
```

This command starts all necessary containers in background

In order to see the logs run

```
$ docker-compose logs -f
```

Example output:
```
tempea_1  | > tempea@0.3.5 start /src
tempea_1  | > node index.js | ${NODE_PATH:-node_modules}/.bin/bunyan -o short -l 30
tempea_1  | 
tempea_1  | 13:46:38.340Z  INFO tempea: Creating cache controller (controller=cache)
tempea_1  | 13:46:38.349Z  INFO tempea: Creating influx client (controller=database)
influx_1  | ts=2019-01-20T13:46:38.484164Z lvl=info msg="Executing query" log_id=0D6rhs5G000 service=query query="CREATE DATABASE temp"
influx_1  | [httpd] 172.19.0.3 - - [20/Jan/2019:13:46:38 +0000] "POST /query HTTP/1.1" 200 57 "-" "node-superagent/3.8.3" cf5a2162-1cb9-11e9-8018-0242ac130002 6017
tempea_1  | 13:46:38.611Z  INFO tempea: Initializing routing module
tempea_1  | 13:46:38.651Z  INFO tempea: Starting Backend on port 3000
tempea_1  | 13:46:38.678Z  INFO tempea: Starting cron job (controller=schedule)
tempea_1  | 13:46:38.885Z  INFO tempea: Backend listening on port 3000
tempea_1  | 13:47:01.658Z  INFO tempea: Room temperature high enough, disabling heating (controller=heat, currentTemp=19.4, desiredTemp=18, overshoot=0.5)
```

## Grafana

[Grafana](https://grafana.com/) can be used to visualize the data stored by tempea into the [InfluxDB](https://www.influxdata.com/). The Raspberry Pi is potent enough to handle both services locally.

In order to access [Grafana](https://grafana.com/) open up a browser and enter
```
http://192.168.0.8:3001
```

The login credentials are
```
username: admin
password: admin
```

Add a new data source with the following parameters
```
Name: tempea
Type: InfluxDB
URL: http://influx:8086
Database: temp
```

Import the tempea dashboard by uploading the _Tempea-Dashboard.json_ from the grafana directory of this project

Select the newly created tempea data source and click *Import*

<p align="center">
  <a href="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/grafana_readme.png" target="_blank">
    <img src="https://raw.githubusercontent.com/eiabea/tempea-api/master/images/grafana_readme.png" width="350" alt="Grafana">
  </a>
</p>

## Develop

### Linux
1. Mount the home directory of your Pi on your PC
```
$ mkdir raspberry
$ sshfs pi@192.168.0.8:/home/pi raspberry
```

2. Clone the project
```
$ cd raspberry
$ git clone https://github.com/eiabea/tempea-api.git
```

3. Change into the project directory and create the secrets folder
```
$ cd tempea-api
$ mkdir secrets
```

4. Copy the secrets json file from Google into the secrets directory and name it _tempea-service.json_ [Obtaining Google Calendar Service JSON](#obtaining-google-calendar-service-json)

5. Connect to the Raspberry Pi via ssh (username: pi, password: raspberry)
```
$ ssh pi@192.168.0.8
```

6. Change to the project directory
```
$ cd tempea-api
```

7. Start tempea in development mode
```
$ docker-compose up
```

## Testing

1. Make sure you have at least [NodeJS](https://nodejs.org/en/) v10.14.0 installed
```
$ node -v
v10.14.0
```

2. Clone the project on your machine
```
$ git clone https://github.com/eiabea/tempea-api.git
```

3. Change to the project directory and install all npm packages
```
$ cd tempea-api
$ npm install
```

4. Run the tests with the following command
```
$ npm test
```

# Contribute

Every help is appreciated, take a look at the [Contributing file](https://github.com/eiabea/tempea-api/tree/master/CONTRIBUTION.md).