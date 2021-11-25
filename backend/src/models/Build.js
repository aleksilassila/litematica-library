const { DataTypes } = require("sequelize");
const { sequelize } = require("../database");

const Build = sequelize.define("build", {
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    buildFile: DataTypes.STRING,
    images: DataTypes.ARRAY(DataTypes.STRING),
    downloads: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    totalFavorites: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
});

Build.prototype.toJSON = async function () {
    return {
        id: this.id,
        title: this.title,
        description: this.description,
        thisFile: this.thisFile,
        images: this.images,
        downloads: this.downloads,
        totalFavorites: this.totalFavorites,
        creatorId: this.creatorId,
        category: await this.getCategory(),
        tags: await this.getTags(),
        collection: await this.getCollection(),
    }
}

module.exports = { Build };