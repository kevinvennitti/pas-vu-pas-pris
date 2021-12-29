const A_micSeuil = 200;
const B_seuilProximity = 20;

const ip = '192.168.43.173';
const port = '3000';

let socleCarteIsBlablating = false;

const five = require("johnny-five");
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);

var ports = [
  { id: "A", port: "/dev/cu.usbmodem143101" }, // Grande Arduino
  { id: "B", port: "/dev/cu.usbserial-14320" } // Petite Arduino
];

const boards = new five.Boards(ports);

let servo2;

boards.on("ready", function() {

  var servo = new five.Servo({
    board: boards.byId("A"),
    id: "MyServo",     // User defined id
    pin: 10,           // Which pin is it attached to?
    range: [0,180],    // Default: 0-180
    fps: 100,          // Used to calculate rate of movement between positions
    invert: false,     // Invert all specified positions
    startAt: 90,       // Immediately move to a degree
    center: true,      // overrides startAt if true and moves the servo to the center of the range
  });

  servo2 = new five.Servo.Continuous({
    board: boards.byId("A"),
    id: "MyServo2",
    pin: 11
  });

  const led = new five.Led({
    board: boards.byId("A"),
    pin: 13,
  });

  var mic = new five.Sensor({
      pin: "A0",
      board: boards.byId("A"),
      freq: 20,
  });

  const proximity = new five.Proximity({
    controller: "HCSR04",
    board: boards.byId("B"),
    pin: 7
  });

  proximity.on("change", () => {
    const {centimeters, inches} = proximity;
    console.log("Proximity: "+ centimeters);

    let triggered = false;

    if (centimeters <= B_seuilProximity) {
      triggered = true;
    }

    io.sockets.emit('sensor/b/proximity', {
      triggered: triggered,
      centimeters: centimeters
    });
  });


  mic.on("data", function() {
    console.log(this.value);

    if (socleCarteIsBlablating == true) {
      if (this.value > A_micSeuil) {
        let micLoud = map_range(this.value, A_micSeuil, 600, 5, 70);
        servo.to(Math.random() * micLoud - micLoud/2 + 96);
      } else {
        servo.to(96);
      }
    } else {
      servo.to(96);
    }
  });



  /*
//  servo2.cw(.05);
setTimeout(function(){

  servo2.to(30);

    setTimeout(function(){
      servo2.stop();
    },2000);
},12000);
*/


/*
  boards.each(board => {
    if (board.id === "B") {
      // Initialize an Led instance on pin 13 of
      // each initialized board and strobe it.
      const led = new five.Led({
        pin: 13,
        board
      });

      led.blink();
    }
  });
  */
});








server.listen(port);
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', function (req, res) {
  res.render('index', {
    ip: ip,
    port: port
  });
});

app.get('/a', function (req, res) {
  res.render('a', {
    ip: ip,
    port: port
  });
});

app.get('/b', function (req, res) {
  res.render('b', {
    ip: ip,
    port: port
  });
});

app.get('/c', function (req, res) {
  res.render('c', {
    ip: ip,
    port: port
  });
});

app.get('/intro', function (req, res) {
  res.render('intro', {
    ip: ip,
    port: port
  });
});

io.on('connection', function (socket) {

  socket.on('sendCommand/client_to_server_to_client', function (data) {
    console.log('sendCommand/client_to_server_to_client');
    console.log(data);

    if (data.command == 'a/before/play'
     || data.command == 'a/main/play'
    || data.command == 'a/before/playfromstart'
     || data.command == 'a/main/playfromstart') {
      socleCarteIsBlablating = true;
    }

    if (data.command == 'a/before/pause'
     || data.command == 'a/main/pause') {
      socleCarteIsBlablating = false;
    }

    io.sockets.emit(data.command);
  });


    socket.on('sendCommand/a/prisme/go', function (data) {
        servo2.ccw(.2);
        setTimeout(function(){
          servo2.stop();
        },600);

    });
    socket.on('sendCommand/a/prisme/stop', function (data) {

        servo2.stop();
    });

});







function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}
