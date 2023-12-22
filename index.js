import express from "express";
import dotenv from "dotenv";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
	res.send("Server is ready");
});

app.get("/api/jokes", (req, res) => {
	const jokes = [
		{ id: 1, title: "First one", content: "Joke One" },
		{ id: 2, title: "Second one", content: "Joke Two" },
		{ id: 3, title: "Third one", content: "Joke Three" },
		{ id: 4, title: "Fourth one", content: "Joke Four" },
		{ id: 5, title: "Fifth one", content: "Joke Five" },
	];
	res.send(jokes);
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
