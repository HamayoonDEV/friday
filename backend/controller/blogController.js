import Joi from "joi";
import fs from "fs";
import Blog from "../models/blog.js";
import { BACKEND_SERVER_PATH } from "../config/index.js";
import BlogDTO from "../Dto/blogDto.js";

const mongoIdPattern = /^[0-9a-fA-F]{24}$/;

const blogController = {
  //creareBlog controller
  async createBlog(req, res, next) {
    //validate blog input data
    const blogCreateSchema = Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      photoPath: Joi.string().required(),
      author: Joi.string().regex(mongoIdPattern).required(),
    });
    const { error } = blogCreateSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const { title, content, photoPath, author } = req.body;

    //read photo as a buffer
    const buffer = Buffer.from(
      photoPath.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
      "base64"
    );
    //Allot random names
    const imagePath = `${Date.now()}-${author}.png`;
    //store locally
    try {
      fs.writeFileSync(`storage/${imagePath}`, buffer);
    } catch (error) {
      return next(error);
    }
    //store blog in database
    let blog;
    try {
      const newBlog = new Blog({
        title,
        content,
        author,
        photopath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`,
      });
      blog = await newBlog.save();
    } catch (error) {
      return next(error);
    }
    //sending response
    const blogDto = new BlogDTO(blog);
    res.status(201).json({ blog: blogDto });
  },

  //get All blogs controller

  async getAll(req, res, next) {
    //get blogs from db
    try {
      const blogs = await Blog.find({});
      const blogsDto = [];

      //looping over the blogs veriable
      for (let i = 0; i < blogs.length; i++) {
        const dto = new BlogDTO(blogs[i]);

        blogsDto.push(dto);
      }
      return res.status(200).json({ blogs: blogsDto });
    } catch (error) {
      return next(error);
    }
  },
  //get blogById controller

  async getBlogById(req, res, next) {
    //validate id Schema
    const blogIdSchema = Joi.object({
      id: Joi.string().regex(mongoIdPattern).required(),
    });
    const { error } = blogIdSchema.validate(req.params);
    if (error) {
      return next(error);
    }
    const { id } = req.params;
    let blog;
    try {
      blog = await Blog.findOne({ _id: id });
    } catch (error) {
      return next(error);
    }
    const blogDto = new Blog(blog);
    return res.status(200).json({ blog: blogDto });
  },
};

export default blogController;
