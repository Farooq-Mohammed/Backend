import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
	path: "./env",
});

const PORT = process.env.PORT || 8080;

connectDB()
	.then(() => {
		app.on("error", (error) => {
			console.error("connection Error", error);
			throw error;
		});
		app.listen(PORT || 8000, () => {
			console.log(`Server is running at port : ${process.env.PORT}`);
		});
	})
	.catch((err) => {
		console.log("MONGO db connection failed !!! ", err);
	});
