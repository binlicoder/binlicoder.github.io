hexo.extend.generator.register('category-navigation', function (locals) {
  return {
    path: 'category-navigation.json',
    data: JSON.stringify(locals.categories.filter(category => category.length > 0).map(category => ({ name: category.name, path: category.path, count: category.length })))
  };
});
