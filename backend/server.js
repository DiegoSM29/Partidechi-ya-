const express = require("express");

const app = express();

const PORT = 5050;

app.get("/", (req, res) => {
    res.send("Juega ya!");
    console.log("Request: ",req.host)
})

app.get("/info", (req, res) => {
    res.send("Esta app es para armar partidos cuando quieras!");
})

app.get("/contacto", (req, res) => {
    res.send("Contactate con el siguiente número: 12345");
})

app.get("/recinto", (req, res) => {
    res.send("Módulo de recintos de la app");
    // console.log("Response: ",res)
    console.log("")
})

app.listen(PORT, () => {
    console.log(`Servidor ejecutandose en: http://localhost:${PORT}`);
})

app.get("/saludo", (req, res) => {
    res.send("Bienvenido a partidechi ya!")
})