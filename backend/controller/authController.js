import Joi from "joi";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import UserDTO from "../Dto/userDto.js";
import JWTservices from "../services/JWTservices.js";
import RefreshToken from "../models/token.js";

const passwordPattren =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[ -/:-@\[-`{-~]).{6,64}$/;
const authController = {
  //register controller
  async register(req, res, next) {
    //validate user input
    const userRegisterSchema = Joi.object({
      username: Joi.string().min(5).max(30).required(),
      name: Joi.string().max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattren).required(),
      confirmpassword: Joi.ref("password"),
    });
    //validate userRegisterSchema
    const { error } = userRegisterSchema.validate(req.body);
    //if error occurs middlerWare will handle it
    if (error) {
      return next(error);
    }
    //destructure data from req.body
    const { username, name, email, password } = req.body;

    //password hashing using bcrypt

    const hashedPassword = await bcrypt.hash(password, 10);

    //Handle email and username conflict

    try {
      const emailInUse = await User.exists({ email });
      const usernameInUse = await User.exists({ username });

      if (emailInUse) {
        const error = {
          status: 409,
          message: "Email is already in use please use anOther email!!!",
        };
        return next(error);
      }
      if (usernameInUse) {
        const error = {
          status: 409,
          message:
            "username is not Available please choose anOther Username!!!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //save Register data in database
    let user;
    try {
      const userToRegister = new User({
        username,
        name,
        email,
        password: hashedPassword,
      });
      user = await userToRegister.save();
    } catch (error) {
      return next(error);
    }
    //genrate token
    const accessToken = JWTservices.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JWTservices.signRefreshToken({ _id: user._id }, "60m");
    //store refresh token
    await JWTservices.storeRefreshToken(refreshToken, user._id);
    //sending tokens to the cookies
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    //send response
    res.status(201).json({ user, auth: true });
  },

  //login controller

  async login(req, res, next) {
    //validate user input using joi

    const userLoginSchema = Joi.object({
      username: Joi.string().min(5).max(30).required(),
      password: Joi.string().pattern(passwordPattren).required(),
    });
    //validate userLoginSchema
    const { error } = userLoginSchema.validate(req.body);
    //if error occurs middleWare will handle it
    if (error) {
      return next(error);
    }
    //destructure data from req.body
    const { username, password } = req.body;

    //fetching username and password from the database
    let user;
    try {
      user = await User.findOne({ username });
      if (!user) {
        const error = {
          status: 401,
          message: "invalid username!!!",
        };
        return next(error);
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        const error = {
          status: 401,
          message: "invalid password!!!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //intigrating tokens
    //token genration
    const accessToken = JWTservices.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JWTservices.signRefreshToken({ _id: user._id }, "60m");
    //update refresh tokento the database
    try {
      await RefreshToken.updateOne(
        { _id: user._id },
        { token: refreshToken },
        { upsert: true }
      );
    } catch (error) {
      return next(error);
    }
    //sending tokens to the cookies
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    //sending response
    const userDto = new UserDTO(user);
    res.status(200).json({ user: userDto, auth: true });
  },

  //logout controller
  async logout(req, res, next) {
    //feth refresh token from tokens
    const { refreshToken } = req.cookies;
    //delete it from data base
    try {
      await RefreshToken.deleteOne({ token: refreshToken });
    } catch (error) {
      return next(error);
    }
    //clear the cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    //send response
    res.status(200).json({ user: null, auth: false });
  },

  //refresh controller
  async refresh(req, res, next) {
    //fetch refresh token from cookies
    const originalRefreshToken = req.cookies.refreshToken;

    //verify refresh token
    let _id;
    try {
      _id = JWTservices.verifyRefreshToken(originalRefreshToken)._id;
    } catch (e) {
      const error = {
        status: 409,
        message: "unAuthorized!!!",
      };
      return next(error);
    }
    //match refresh Token
    try {
      const match = await RefreshToken.findOne({
        _id: _id,
        token: originalRefreshToken,
      });
      if (!match) {
        const error = {
          status: 409,
          message: "unAuthorized!!!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //genrate tokens
    try {
      const accessToken = JWTservices.signAccessToken({ _id: _id }, "30m");
      const refreshToken = JWTservices.signRefreshToken({ _id: _id }, "60m");
      //update refresh token to the database
      await RefreshToken.updateOne({ _id: _id }, { toke: refreshToken });
      //sending tokens to the cookies
      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });
      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });
    } catch (error) {
      return next(error);
    }
    //sending response
    const user = await User.findOne({ _id });
    const userDto = new UserDTO(user);
    res.status(200).json({ user: userDto });
  },
};

export default authController;
