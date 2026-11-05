hexo.extend.filter.register('before_post_render', function (data) {
  data.top_img = false;
  return data;
});
