import { asyncHandler } from "../utils/asyncHanlder.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
	// Get user details from frontend
	// Validation - not empty
	// Check if user already exists: username, email
	// Check for images, check for avatar
	// Upload them to cloudinary, avatar
	// Create user object - create entry in db
	// Remove password and refresh token field from response
	// Check for user creation

	const { username, fullname, email, password } = req.body;

	if (
		[fullname, email, password, username].some(
			(field) => field.trim().length() == 0
		)
	) {
		throw new ApiError(400, "All fields are required");
	}

	const existedUser = await User.findOne({
		$or: [{ username }, { email }],
	});

	if (existedUser)
		throw new ApiError(409, "User with email/username already exists");

	const avatarLocalPath = req.files?.avatar[0]?.path;
	if (!avatarLocalPath) throw new ApiError(400, "Avatar file is requied");

	const avatar = await uploadOnCloudinary(avatarLocalPath);
	if (!avatar) throw new ApiError(400, "Avatar file is required");

	const coverImageLocalPath = req.files?.coverImage[0]?.path;
	if (!coverImageLocalPath) throw new ApiError(400, "Cover image is required");

	const coverImage = await uploadOnCloudinary(coverImageLocalPath);
	if (!coverImage) throw new ApiError(400, "Cover Image is required");

	const user = await User.create({
		fullname,
		avatar: avatar.url,
		coverImage: coverImage.url || "",
		email,
		password,
		username: username.toLowerCase(),
	});

	const createdUser = await User.findById(user._id).select(
		"-password -refreshToken"
	);

	if (!createdUser)
		throw new ApiError(500, "Something went wrong while registering the user");

	return res
		.status(201)
		.json(new ApiResponse(200, createdUser, "User registered successfully!!"));
});

export { registerUser };
