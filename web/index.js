const express = require('express');
const http_server = require("http").Server(express());
const io_server = require("socket.io")(http_server);

const app = express();
const http_publisher = require("http").Server(app);
const io_publisher = require("socket.io")(http_publisher);

// setting express
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

// render browser
app.get("/", function (req, res) {
    res.render("index.ejs");
});

io_server.on("connection", function (socket) {
    console.log(`SocketIO Connected - ID: ${socket.id}`);

    socket.on("pointcloud", function (msg) {
        io_publisher.emit("pointcloud", msg);
    });

    socket.on("image", function (msg) {
        io_publisher.emit("image", { image: true, buffer: msg });
    });
});

io_publisher.on("connection", function (socket) {
    console.log(`Web Connected - ID: ${socket.id}`);
});

http_server.listen(3000, () => {
    console.log('SocketIO server listening on *:3000');
});

http_publisher.listen(3001, () => {
    console.log('Http server listening on http://localhost:3001');
});