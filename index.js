const express = require("express");
const app = express();
const port = 8000;

app.get("/", (req, res) => {
	res.send("Hello World!");
});

app.get("/login", (req, res) => {
	res.send("<h1>Login</h1>");
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
