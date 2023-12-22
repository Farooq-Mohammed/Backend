const express = require("express");
const dotenv = require("dotenv");
const app = express();

dotenv.config();
const port = process.env.PORT;

app.get("/", (req, res) => {
	res.send("Hello World!");
});

app.get("/login", (req, res) => {
	res.send("<h1>Login</h1>");
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
