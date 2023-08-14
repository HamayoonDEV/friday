class BlogDTO {
  constructor(blog) {
    this._id = blog._id;
    this.auther = blog.auther;
    this.content = blog.content;
    this.title = blog.title;
    this.photopath = blog.photopath;
  }
}
export default BlogDTO;
