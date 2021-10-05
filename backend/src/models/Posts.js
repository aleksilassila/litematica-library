const { Favorites } = require("./Favorites");
const { DataTypes } = require("sequelize");
const { sequelize } = require("../database");

const Posts = exports.Posts = sequelize.define("posts", {
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    buildFile: DataTypes.STRING,
    images: DataTypes.ARRAY(DataTypes.STRING),
    downloads: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
});

Posts.hasMany(Favorites);
