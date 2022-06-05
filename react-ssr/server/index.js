require("ignore-styles");

require("@babel/register")({
  ignore: [/(node_module)/],
  presets: ["@babel/preset-env", "@babel/preset-react"],
});

//Takes the [Object object] an turns it into a url string
require("asset-require-hook")({
  extensions: ["jpg", "png", "gif", "webp", "svg"],
  limit: 10000,
  name: "static/media/[name].[ext]",
});

require("./server");
