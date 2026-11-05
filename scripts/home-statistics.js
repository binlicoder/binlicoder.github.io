hexo.extend.generator.register('home-statistics', function (locals) {
  const posts = locals.posts.toArray();
  const latest = posts.reduce((date, post) => {
    const updated = post.updated || post.date;
    return updated && (!date || updated.valueOf() > date.valueOf()) ? updated : date;
  }, null);
  return {
    path: 'home-statistics.json',
    data: JSON.stringify({
      posts: posts.length,
      categories: locals.categories.filter(category => category.length > 0).length,
      tags: locals.tags.filter(tag => tag.length > 0).length,
      updated: latest ? latest.format('YYYY-MM-DD') : null
    })
  };
});
