import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

export const app = express();

app.use(
	cors({
		origin: process.env.CORS_ORIGIN,
		credentials: true,
	})
);

app.use(express.static("public"));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// app.get("/", (req, res) => {
// 	res.send("Server is ready");
// });

// app.get("/api/jokes", (req, res) => {
// 	const jokes = [
// 		{ id: 1, title: "First one", content: "Joke One" },
// 		{ id: 2, title: "Second one", content: "Joke Two" },
// 		{ id: 3, title: "Third one", content: "Joke Three" },
// 		{ id: 4, title: "Fourth one", content: "Joke Four" },
// 		{ id: 5, title: "Fifth one", content: "Joke Five" },
// 	];
// 	res.send(jokes);
// });
