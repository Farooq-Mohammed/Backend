import { asyncHandler } from "../utils/asyncHanlder.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const options = {
	httpOnly: true,
	secure: true,
};

const generateAccessAndRefreshToken = async (user) => {
	try {
		const accessToken = user.generateAccessToken();
		const refreshToken = user.generateRefreshToken();

		user.refreshToken = refreshToken;
		await user.save({ validateBeforeSave: false });

		return { accessToken, refreshToken };
	} catch (error) {
		throw new ApiError(
			500,
			"Something went wrong while generating refresh and access token"
		);
	}
};

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
		[fullname, email, password, username].some((field) => field?.trim() === "")
	) {
		throw new ApiError(400, "All fields are required");
	}

	const existedUser = await User.findOne({
		$or: [{ username }, { email }],
	});

	if (existedUser)
		throw new ApiError(409, "User with email or username already exists");

	const avatarLocalPath = req.files?.avatar[0]?.path;
	if (!avatarLocalPath) throw new ApiError(400, "Avatar file is requied");

	const avatar = await uploadOnCloudinary(avatarLocalPath);
	if (!avatar) throw new ApiError(400, "Avatar file could not be loaded");

	const coverImageLocalPath =
		req.files &&
		Array.isArray(req.files.coverImage) &&
		req.files.coverImage.length > 0
			? req.files.coverImage[0].path
			: "";

	const coverImage = await uploadOnCloudinary(coverImageLocalPath);

	const user = await User.create({
		fullname,
		email,
		password,
		username: username.toLowerCase(),
		avatar: avatar.url,
		coverImage: coverImage?.url || "",
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

const loginUser = asyncHandler(async (req, res) => {
	// Req body -> data
	// Username or email
	// Find the user
	// Password check
	// Access and refresh token
	// Send cookie

	const { username, email, password } = req.body;
	console.log(username, email, password);

	if (!username && !email)
		throw new ApiError(400, "Username or email is required");

	const user = await User.findOne({
		$or: [{ username }, { email }],
	});

	if (!user) throw new ApiError(404, "User does not exists in the database");

	const isPasswordValid = await user.isPasswordCorrect(password);
	if (!isPasswordValid) throw new ApiError(401, "Invalid user credentials");

	const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
		user
	);

	const loggedinUser = await User.findById(user._id).select(
		"-password -refreshToken"
	);

	return res
		.status(200)
		.cookie("accessToken", accessToken, options)
		.cookie("refreshToken", refreshToken, options)
		.json(
			new ApiResponse(
				200,
				{ user: loggedinUser, accessToken, refreshToken },
				"User loggedin successfully!!"
			)
		);
});

const logoutUser = asyncHandler(async (req, res) => {
	await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: { refreshToken: undefined },
		},
		{ new: true }
	);

	return res
		.status(200)
		.clearCookie("accessToken", options)
		.clearCookie("refreshToken", options)
		.json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
	// look for refreshToken
	const incomingRefreshToken =
		req.cookies.refreshToken || req.body.refreshToken;

	if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

	// decode the refresh token
	const decodedToken = jwt.verify(
		incomingRefreshToken,
		process.env.REFRESH_TOKEN_SECRET
	);

	const user = await User.findById(decodedToken._id);
	if (!user) throw new ApiError(401, "Invalid Refresh Token");

	// verify the token
	if (incomingRefreshToken !== user?.refreshToken)
		throw new ApiError(401, "Refresh Token is expired or used");

	const { newAccessToken, newRefreshToken } =
		await generateAccessAndRefreshToken(user);

	return res
		.status(200)
		.cookie("accessToken", newAccessToken, options)
		.cookie("refreshToken", newRefreshToken, options)
		.json(
			new ApiResponse(
				200,
				{ accessToken: newAccessToken, refreshToken: newRefreshToken },
				"Access token refreshed"
			)
		);
});

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
	try {
		const { oldPassword, newPassword } = req.body;

		if (!oldPassword || !newPassword)
			throw new ApiError(400, "Please provide oldPassword and newPassword");

		const user = await User.findById(req.user?._id);
		const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

		if (!isPasswordCorrect) throw new ApiError(400, "Invalid password");

		user.password = newPassword;
		await user.save({ validateBeforeSave: false });

		return res
			.status(200)
			.json(new ApiResponse(200, {}, "Password changed successfully!"));
	} catch (error) {
		throw new ApiError(400);
	}
});

const getCurrentUser = asyncHandler(async (req, res) => {
	return res
		.status(200)
		.json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
	const { fullName, email } = req.body;

	if (!fullName || !email) {
		throw new ApiError(400, "All fields are required");
	}
	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				fullname: fullName,
				email,
			},
		},
		{ new: true }
	).select("-password");

	return res
		.status(200)
		.json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
	const avatarLocalPath = req.file?.path;

	if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");

	const avatar = await uploadOnCloudinary(avatarLocalPath);

	if (!avatar?.url) throw new ApiError(400, "Error while uploading avatar");

	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				avatar: avatar.url,
			},
		},
		{ new: true }
	).select("-password");

	return res
		.status(200)
		.json(new ApiResponse(200, user, "Avatar updated successfully!!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
	const coverImageLocalPath = req.file?.path;

	if (!coverImageLocalPath)
		throw new ApiError(400, "Cover image file is missing");

	const coverImage = await uploadOnCloudinary(coverImageLocalPath);

	if (!coverImage?.url)
		throw new ApiError(400, "Error while uploading cover Image");

	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				coverImage: coverImage.url,
			},
		},
		{ new: true }
	).select("-password");

	return res
		.status(200)
		.json(new ApiResponse(200, user, "Cover image updated successfully!!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
	const { username } = req.params;

	if (!username?.trim()) throw new ApiError(400, "Channel name is missing");

	const channel = await User.aggregate([
		{
			$match: {
				username: username?.toLowerCase(),
			},
		},
		{
			$lookup: {
				from: "subscriptions",
				localField: "_id",
				foreignField: "channel",
				as: "subscribers",
			},
		},
		{
			$lookup: {
				from: "subscriptions",
				localField: "_id",
				foreignField: "subscriber",
				as: "subscribedTo",
			},
		},
		{
			$addFields: {
				subscribersCount: {
					$size: $subscribers,
				},
				channelsSubscribedToCount: {
					$size: $subscribedTo,
				},
				isSubscribed: {
					$cond: {
						if: { $in: [req.user?._id, "$subscribers.subscriber"] },
						then: true,
						else: false,
					},
				},
			},
		},
		{
			$project: {
				fullname: 1,
				username: 1,
				email: 1,
				avatar: 1,
				coverImage: 1,
				subscribersCount: 1,
				channelsSubscribedToCount: 1,
				isSubscribed: 1,
			},
		},
	]);

	if (!channel?.length) throw new ApiErro(400, "Channel does not exists");

	return res
		.status(200)
		.json(
			new ApiResponse(200, channel[0], "User channel fetched successfully")
		);
});

export {
	registerUser,
	loginUser,
	logoutUser,
	refreshAccessToken,
	changeCurrentUserPassword,
	getCurrentUser,
	updateAccountDetails,
	updateUserAvatar,
	updateUserCoverImage,
	getUserChannelProfile,
};
